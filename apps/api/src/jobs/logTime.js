module.exports.logTime = async ({}) => {
  console.log('logTime start');
  return new Promise(async resolve => {
    try {
      console.log(new Date());

      console.log('logTime end');
      return resolve();
    } catch (e) {
      console.log(e);

      console.log('logTime errored');
      return resolve();
    }
  });
};
