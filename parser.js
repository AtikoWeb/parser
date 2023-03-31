import puppeteer from 'puppeteer';
import fs from 'fs';

export async function parser(email, password, fileName) {
	try {
		//Начало парсинга
		console.time('Parser');

		const browser = await puppeteer.launch({
			args: ['--no-sandbox'],
		});
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });

		await page.goto('https://kaspi.kz/mc/#/login', {
			waitUntil: 'networkidle2',
		});

		await new Promise((resolve) => setTimeout(resolve, 2000));

		const navbar = await page.$('.navbar-item');

		if (!navbar) {
			await page.waitForSelector('.tabs.is-centered.is-fullwidth');
			await page.click('.tabs.is-centered.is-fullwidth li:nth-child(2)');

			await page.waitForSelector('#user_email');

			await page.type('#user_email', email);

			const button = await page.waitForSelector('.is-primary');
			await button.click();

			await page.waitForSelector('input[type="password"]');

			await page.type('input[type="password"]', password);

			await page.click('.is-primary');

			await page.waitForSelector('.navbar-item');
		}

		await page.waitForNavigation();
		await page.goto('https://kaspi.kz/mc/#/products/ACTIVE/1', {
			waitUntil: 'networkidle2',
		});

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

				const productStatus = await productRow.$('td[data-label="Статус"]');
				const status = await page.evaluate(
					(productStatus) => productStatus.textContent.trim(),
					productStatus
				);

				products.push({
					id,
					name: productName,
					url: productUrl,
					price,
					status,
				});
			}

			// Найти элемент кнопки "Next page"
			const nextPageButton = await page.waitForSelector('.pagination-next');

			// Если кнопка не имеет атрибута "disabled", то кликнуть на неё
			const isDisabled = await nextPageButton.evaluate((button) =>
				button.hasAttribute('disabled')
			);
			if (!isDisabled) {
				await nextPageButton.click();
				await page.waitForSelector('.pagination-next');
			} else {
				isButtonEnabled = false;
			}
		}
		//Конец парсинга
		console.timeEnd('Parser');

		const space = 2;

		const name = fileName + '.json';

		fs.writeFile(name, JSON.stringify(products, null, space), (err) => {
			if (err) throw err;
			console.log('Результаты сохранены в файл products.json');
		});

		browser.close();
	} catch (error) {
		console.log(`Ошибка подключения! ${error}`);
	}
}
