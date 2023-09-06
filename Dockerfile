# Используйте образ Node.js версии 19.6.0
FROM node:19.6.0

# Установите необходимые зависимости для Playwright и графическую подсистему
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libgbm-dev \
    libnss3 \
    libxkbcommon-x11-0 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxwayland-client0 \
    libxwayland-server0 \
    libgl1-mesa-dri \
    libegl1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Установите директорию приложения в контейнере
WORKDIR /app

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
