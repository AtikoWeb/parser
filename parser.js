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

		await page.goto('https://kaspi.kz/mc/#/login');

		const navbar = await page.$('.navbar-item');

		//Вход в Кабинет
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

		await page.waitForNavigation();
		await page.goto('https://kaspi.kz/mc/#/products/ACTIVE/1');

		let isButtonEnabled = true;

		const products = [];
		const ids = new Set();

		while (isButtonEnabled) {
			const productRows = await page.$$('tbody tr');
			const numRows = Math.min(productRows.length, 10); // не проходим больше 10 строк
			for (let i = 0; i < numRows; i++) {
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

				// Проверяем, есть ли такой id в Set, если нет, то сохраняем продукт и добавляем id в Set
				if (!ids.has(id)) {
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

					ids.add(id);

					products.push({
						id,
						name: productName,
						url: productUrl,
						price,
						status,
					});
				}
			}

			// Найти элемент кнопки "Next page"
			const nextPageButton = await page.waitForSelector('.pagination-next');

			// Если кнопка не имеет атрибута "disabled", то кликнуть на неё
			const isDisabled = await nextPageButton.evaluate((button) =>
				button.hasAttribute('disabled')
			);

			// Получить текст, содержащий количество товаров на странице
			const pageInfo = await page.$('.page-info');
			const pageText = await pageInfo.evaluate((pageInfo) =>
				pageInfo.textContent.trim()
			);
			const matches = pageText.match(/из\s+(\d+)/);
			const totalProducts = matches[1];

			// Проверяем, собрано ли количество товаров на странице равно общему количеству товаров
			if (products.length === parseInt(totalProducts)) {
				isButtonEnabled = false;
			} else if (!isDisabled) {
				await nextPageButton.click();
				await page.waitForSelector('.pagination-next');
			} else {
				isButtonEnabled = false;
			}
			console.log(`Parsing... ${pageText}`);
		}
		//Конец парсинга
		console.timeEnd('Parser');

		console.log(products.length);

		const space = 2;

		const name = fileName + '.json';

		fs.writeFile(name, JSON.stringify(products, null, space), (err) => {
			if (err) throw err;
			console.log(`Результаты сохранены в файл ${name}`);
		});

		browser.close();
	} catch (error) {
		console.log(`Ошибка подключения! ${error}`);
	}
}
