FROM node:20

WORKDIR /app

COPY ./ ./

RUN npm install -g homey
RUN npm install

ENTRYPOINT [ "bash" ]
