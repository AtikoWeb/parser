import { firefox } from 'playwright';
import fs from 'fs/promises';

export async function parser(email, password, fileName) {
	try {
		console.time('Parser');

		const browser = await firefox.launch();
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.setViewportSize({
			width: 1280,
			height: 720,
		});

		await page.goto('https://kaspi.kz/mc/#/login', { timeout: 60000 });

		await page.screenshot({ path: 'image.png' });

		const navbar = await page.$('.navbar-item');

		if (!navbar) {
			await page.waitForSelector('.tabs.is-centered.is-fullwidth');
			await page.click('.tabs.is-centered.is-fullwidth li:nth-child(2)');
			await page.waitForSelector('#user_email');
			await page.type('#user_email', email);
			await page.screenshot({ path: 'image.png' });

			const buttonContinue = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonContinue.click();

			await page.waitForSelector('input[type="password"]');
			await page.type('input[type="password"]', password);
			await page.screenshot({ path: 'image.png' });

			const buttonSubmit = await page.waitForSelector(
				'button[class="button is-primary"]:not(:empty):not(:has(*))'
			);
			await buttonSubmit.click();

			await page.waitForSelector('.navbar-item');
		}

		await page.goto('https://kaspi.kz/mc/#/products/ACTIVE/1', {
			timeout: 60000,
		});

		await page.screenshot({ path: 'image.png', timeout: 5000 });

		let isButtonEnabled = true;
		const products = [];
		const ids = new Set();

		while (isButtonEnabled) {
			const productRows = await page.$$('tbody tr');
			const numRows = Math.min(productRows.length, 10);

			for (let i = 0; i < numRows; i++) {
				const productRow = productRows[i];
				const productNameElement = await productRow.$(
					'td[data-label="Товар"] a'
				);
				const productName = await productNameElement.evaluate(
					(el) => el.textContent
				);
				const productUrl = await productNameElement.evaluate((el) => el.href);
				const productPrice = await productRow.$(
					'td[data-label="Цена, тенге"] p.subtitle.is-5'
				);
				const price = await productPrice.evaluate((el) =>
					el.textContent.trim()
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

			const nextPageButton = await page.waitForSelector('.pagination-next', {
				timeout: 120000,
			});

			const isDisabled = await nextPageButton.evaluate((el) =>
				el.hasAttribute('disabled')
			);
			const pageInfoElement = await page.$('.page-info');
			const pageText = await pageInfoElement.evaluate((el) => el.textContent);
			const matches = pageText.match(/из\s+(\d+)/);
			const totalProducts = matches[1];

			if (products.length >= parseInt(totalProducts)) {
				isButtonEnabled = false;
			} else if (!isDisabled) {
				await nextPageButton.click();
			} else {
				isButtonEnabled = false;
			}
			console.log(`Parsing... ${pageText}`);
		}

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
