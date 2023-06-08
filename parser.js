import { chromium } from 'playwright';
import fs from 'fs/promises';

export async function parser(email, password, fileName) {
	try {
		// Начало парсинга
		console.time('Parser');

		const browser = await chromium.launch({
			args: ['--no-sandbox', '--disable-dev-shm-usage'],
			ignoreHTTPSErrors: true,
		});

		const context = await browser.newContext({
			viewport: { width: 1920, height: 1080 },
		});

		const page = await context.newPage();

		await page.goto('https://kaspi.kz/mc/#/login');

		const navbar = await page.$('.navbar-item');

		// Вход в Кабинет
		if (!navbar) {
			await page.waitForSelector('.tabs.is-centered.is-fullwidth');
			await page.click('.tabs.is-centered.is-fullwidth li:nth-child(2)');

			await page.waitForSelector('#user_email');

			await page.fill('#user_email', email);

			const buttonContinue = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonContinue.click();

			await page.waitForSelector('input[type="password"]');

			await page.fill('input[type="password"]', password);

			await page.screenshot({ path: 'image1.png' });

			const buttonSubmit = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonSubmit.click();

			await page.waitForSelector('.navbar-item');
			await page.screenshot({ path: 'image2.png' });
		}

		await page.waitForNavigation();

		await page.goto('https://kaspi.kz/mc/#/products/ACTIVE/1', {
			timeout: 120000,
		});

		await page.waitForSelector('.pagination-next', { timeout: 120000 });

		await page.screenshot({ path: 'image.png' });

		let isButtonEnabled = true;

		const products = [];
		const ids = new Set();

		while (isButtonEnabled) {
			const productRows = await page.$$('tbody tr');
			const numRows = productRows.length < 10 ? productRows.length : 10;

			for (let i = 0; i < numRows; i++) {
				const productRow = productRows[i];

				const productInfo = await productRow.$('td[data-label="Товар"]');

				const productLink = await productInfo.$('a');
				const productName = await productLink.textContent();

				const productUrl = await productLink.getAttribute('href');

				const regexpId = /\d{9}_\d{8}/;

				const currentTitle = await productInfo.$('p.subtitle.is-6');
				const title = await currentTitle.innerText();

				const id = title.match(regexpId);

				// Проверяем, есть ли такой id в Set, если нет, то сохраняем продукт и добавляем id в Set
				const productPrice = await productRow.$(
					'td[data-label="Цена, тенге"] p.subtitle.is-5'
				);
				const price = await productPrice.textContent();

				const productStatus = await productRow.$('td[data-label="Статус"]');
				const status = await productStatus.innerText();

				ids.add(id);

				products.push({
					id,
					name: productName,
					url: productUrl,
					price,
					status,
				});
			}

			// Найти элемент кнопки "Next page"
			const nextPageButton = await page.waitForSelector('.pagination-next', {
				timeout: 60000,
			});

			// Если кнопка не имеет атрибута "disabled", то кликнуть на неё
			const isDisabled = await nextPageButton.getAttribute('disabled');

			// Получить текст, содержащий количество товаров на странице
			const pageInfo = await page.$('.page-info');
			const pageText = await pageInfo.textContent();
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
