# Используйте образ Node.js версии 19.6.0
FROM node:19.6.0

# Установите директорию приложения в контейнере
WORKDIR /app

# Установите зависимости для Playwright
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libgl1-mesa-dri \
    libegl1-mesa \
    libglib2.0-0 \
    libx11-xkb-dev \
    libxkbcommon-x11-0 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgbm1 \
    libfontconfig1 \
    libxv1 \
    libharfbuzz-icu0 \
    libharfbuzz0b \
    libgudev-1.0-0 \
    libwayland-client0 \
    libwayland-server0 \
    libwayland-egl1 \
    libudev1 \
    libsecret-1-0 \
    libhyphen0 \
    libepoxy0 \
    libopus0 \
    libfontconfig1 \
    libfreetype6 \
    libxi6 \
    libsm6 \
    && rm -rf /var/lib/apt/lists/*

# Скопируйте зависимости и исходный код
COPY package*.json ./
COPY index.js ./
COPY parser.js ./

# Установите зависимости
RUN npm install

# Откройте порт, на котором работает ваше приложение
EXPOSE 7777

# Запустите приложение
CMD ["node", "index.js"]
