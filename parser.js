import puppeteer from 'puppeteer';
import fs from 'fs/promises';

export async function parser(email, password, fileName) {
	try {
		// Начало парсинга
		console.time('Parser');

		const browser = await puppeteer.launch({
			headless: 'new',
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
			ignoreHTTPSErrors: true,
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });

		await page.goto('https://kaspi.kz/mc/#/login');

		const navbar = await page.$('.navbar-item');

		// Вход в Кабинет
		if (!navbar) {
			await page.waitForSelector('.tabs.is-centered.is-fullwidth');
			await page.click('.tabs.is-centered.is-fullwidth li:nth-child(2)');

			await page.waitForSelector('#user_email');

			await page.type('#user_email', email);

			const buttonContinue = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonContinue.click();

			await page.waitForSelector('input[type="password"]');

			await page.type('input[type="password"]', password);

			const buttonSubmit = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonSubmit.click();

			await page.waitForSelector('.navbar-item');
		}

		await page.goto(`https://kaspi.kz/mc/#/products/ACTIVE/1`, {
			timeout: 30000,
		});

		await page.waitForNavigation();
		await page.screenshot({ path: 'image.png' });

		let isButtonEnabled = true;

		const products = [];
		const ids = new Set();

		while (isButtonEnabled) {
			const productRows = await page.$$('tbody tr');
			const numRows = productRows.length < 10 ? productRows.length : 10;

			for (let i = 0; i < numRows; i++) {
				const productRow = productRows[i];

				const productNameElement = await productRow.$(
					'td[data-label="Товар"] a'
				);
				const productName = await (
					await productNameElement.getProperty('textContent')
				).jsonValue();

				const productUrl = await (
					await productNameElement.getProperty('href')
				).jsonValue();

				const productPrice = await productRow.$(
					'td[data-label="Цена, тенге"] p.subtitle.is-5'
				);

				const price = await page.evaluate(
					(productPrice) => productPrice.textContent.trim(),
					productPrice
				);

				const idRegExp = /(\d+)\/$/;
				const matches = productUrl.match(idRegExp);
				const id = matches[1];

				ids.add(id);

				products.push({
					id,
					name: productName,
					url: productUrl,
					price,
				});
			}

			// Найти элемент кнопки "Next page"
			const nextPageButton = await page.waitForSelector('.pagination-next', {
				timeout: 60000,
			});

			// Если кнопка не имеет атрибута "disabled", то кликнуть на неё
			const isDisabled = await page.evaluate(
				(el) => el.hasAttribute('disabled'),
				nextPageButton
			);

			// Получить текст, содержащий количество товаров на странице
			const pageInfoElement = await page.$('.page-info');
			const pageText = await page.evaluate(
				(el) => el.textContent,
				pageInfoElement
			);
			const matches = pageText.match(/из\s+(\d+)/);
			const totalProducts = matches[1];

			// Проверяем, собрано ли количество товаров на странице равно общему количеству товаров
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
		// Конец парсинга
		console.timeEnd('Parser');

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
