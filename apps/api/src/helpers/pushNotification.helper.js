const FCM = require('fcm-node');
const mongoose = require('mongoose');

const { models, enums } = require('./../constants');
const { FCM_SERVER_KEY } = require('./../appConfig');

const fcm = new FCM(FCM_SERVER_KEY);

const Device = mongoose.model(models.DEVICE);
const PushNotificationLog = mongoose.model(models.LOG_PUSH_NOTIFICAION);

module.exports.sendNotification = ({ data, to }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { title, body, notificationType } = data;

      const tokens = await Device.find({ userId: { $in: to } }).lean();

      if (!tokens.length) {
        return;
      }

      const message = {
        registration_ids: tokens.map(a => a.fcmToken),
        notification: { title, body },
        priority: 'high',
        importance: 'max',
        android: { priority: 'high', importance: 'max' },
        aps: { alert: { title, body } },
        data: data,
      };

      for (const token of tokens) {
        const notificationLog = await PushNotificationLog.create({
          to: token.userId,
          source: token.source,
          title: title,
          description: body,
          notificationType,
        });

        message.registration_ids = [token.fcmToken];

        fcm.send(message, async (err, response) => {
          if (err) {
            console.log('Something has gone wrong!', err);
            notificationLog.status = enums.NOTIFICATION_STATUS.FAILED;
          } else {
            console.log('Successfully sent with response: ', response);
            notificationLog.status = enums.NOTIFICATION_STATUS.DELIVERED;
          }

          await notificationLog.save();
        });
      }

      return resolve();
    } catch (e) {
      return reject(e);
    }
  });
};
