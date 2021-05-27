FROM node:12.15.0

COPY . /var/www
WORKDIR /var/www

RUN npm install --only=prod

EXPOSE 3000

ENTRYPOINT ["npm", "start"]
