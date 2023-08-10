import puppeteer from 'puppeteer';
import fs from 'fs/promises';

export async function parser(email, password, fileName) {
	try {
		// Начало парсинга
		console.time('Parser');

		const browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
			ignoreHTTPSErrors: true,
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });

		await page.goto('https://kaspi.kz/mc/#/login', {
			timeout: 60000, // Поправка: увеличить время ожидания загрузки страницы до 60 секунд
		});

		const navbar = await page.$('.navbar-item');

		// Вход в Кабинет

		if (!navbar) {
			await page.waitForSelector('.tabs.is-centered.is-fullwidth');
			await page.click('.tabs.is-centered.is-fullwidth li:nth-child(2)');

			await page.waitForSelector('#user_email');

			await page.type('#user_email', 'timmy.shiyanov@mail.ru');

			const buttonContinue = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonContinue.click();

			await page.waitForSelector('input[type="password"]');

			await page.type('input[type="password"]', 'User#153789');

			const buttonSubmit = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonSubmit.click();

			await page.waitForSelector('.navbar-item');
		}

		await page.goto(`https://kaspi.kz/mc/#/products/ACTIVE/1`);

		let isButtonEnabled = true;

		const products = [];

		while (isButtonEnabled) {
			const productRows = await page.$$('tbody tr');
			for (let i = 0; i < productRows.length; i++) {
				const productRow = productRows[i];

				const productInfo = await productRow.$('td[data-label="Товар"]');

				const productLink = await productInfo.$('a');
				const productName = await page.evaluate(
					(productLink) => productLink.textContent.trim(),
					productLink
				);

				const productUrl = await page.evaluate(
					(productLink) => productLink.href,
					productLink
				);

				const idRegExp = /(\d+)\/$/;
				const matches = productUrl.match(idRegExp);
				const id = matches[1];

				const productPrice = await productRow.$(
					'td[data-label="Цена, тенге"] p.subtitle.is-5'
				);
				const price = await page.evaluate(
					(productPrice) => productPrice.textContent.trim(),
					productPrice
				);

				products.push({
					id,
					name: productName,
					url: productUrl,
					price: price,
				});
			}

			const nextPageButton = await page.waitForSelector('.pagination-next', {
				timeout: 60000,
			});

			const isDisabled = await page.evaluate(
				(el) => el.hasAttribute('disabled'),
				nextPageButton
			);

			const pageInfoElement = await page.$('.page-info');
			const pageText = await page.evaluate(
				(el) => el.textContent,
				pageInfoElement
			);
			const matches = pageText.match(/из\s+(\d+)/);
			const totalProducts = matches[1];

			if (products.length >= parseInt(totalProducts)) {
				isButtonEnabled = false;
			} else if (!isDisabled) {
				await nextPageButton.click();
				await page.waitForSelector('.pagination-next', { timeout: 60000 });
			} else {
				isButtonEnabled = false;
			}
			console.log(`Parsing... ${pageText}`);
		}

		console.timeEnd('Parser'); // Поправка: переместить console.timeEnd в конец, чтобы замерить время после завершения цикла.

		console.log(products.length);

		const space = 2;

		const name = fileName + '.json';

		await fs.writeFile(name, JSON.stringify(products, null, space));
		console.log(`Результаты сохранены в файл ${name}`);

		await browser.close();
	} catch (error) {
		console.log(`Ошибка подключения! ${error}`);
	}
}
