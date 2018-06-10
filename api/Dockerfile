FROM node:alpine
RUN apk add --no-cache make gcc g++ python
RUN mkdir -p /usr/src/pixi/api
WORKDIR /usr/src/pixi/api
COPY package.json /usr/src/pixi/api


RUN npm install --save

COPY . /usr/src/pixi/api

RUN npm install -g nodemon

EXPOSE 8080


CMD ["nodemon", "/usr/src/pixi/api/api.js"]
