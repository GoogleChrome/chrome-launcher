FROM node:alpine

WORKDIR /app

#install chromium/yarn
RUN apk --update --no-cache add chromium xvfb curl bash binutils tar \
    && curl -o- -L https://yarnpkg.com/install.sh | bash \
    && apk del curl tar binutils

COPY package.json .
COPY yarn.lock .

ENV DISPLAY :99.0
ENV CHROME_PATH /usr/lib/chrome

#install
RUN yarn --frozen-lockfile

#copy rest of files in
COPY . .

#build everything
RUN yarn build

ENTRYPOINT [ "/bin/bash", "-c", "yarn test --timeout=100000" ]