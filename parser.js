import { webkit } from 'playwright';
import fs from 'fs/promises';

export async function parser({ fileName }) {

	try {
		console.time('Parser');
		const startTime = Date.now();
		const browser = await webkit.launch({
			headless: true,
		});

		const context = await browser.newContext();
		const page = await context.newPage();

		await page.setViewportSize({
			width: 1920,
			height: 1080,
		});

		await page.goto('https://kaspi.kz/shop/c/women%20underwear/?q=%3Acategory%3AWomen%20underwear%3AallMerchants%3A14666052%3AavailableInZones%3AMagnum_ZONE1&sort=relevance&sc=');

		let isContinue = true;
		const products = [];
		const ids = new Set();

		// Таймер в реальном времени
		const timer = setInterval(() => {
			const elapsedTime = (Date.now() - startTime) / 1000;
			console.log(`Сбор данных, время: ${elapsedTime} сек`);
		}, 1000);

		while (isContinue) {
			const dialog = await page.$('#dialogService > div > div.dialog.animation-fadeIn.current-location__dialog-wrapper');
			if (dialog) {
				await page.click('#dialogService > div > div.dialog.animation-fadeIn.current-location__dialog-wrapper > div.dialog__close');
				await page.waitForTimeout(1000);
			}

			const productElements = await page.$$('.item-cards-grid__cards > .ddl_product');

			for (const productElement of productElements) {
				const productName = await productElement.$eval('.item-card__name-link', node => node.innerText);
				const productPriceText = await productElement.$eval('.item-card__prices-price', node => node.innerText);
				const productPrice = parseInt(productPriceText.replace(/\D/g, ''), 10);
				const productId = await productElement.getAttribute('data-product-id');
				// const productUrl = await productElement.$eval('.item-card__name-link', node => node.getAttribute('href'));

				ids.add(productId);
				products.push({
					id: productId,
					name: productName,
					price: productPrice,
					// url: productUrl,
				});
			}

			const nextButton = await page.$('.pagination__el:has-text("Следующая →")');

			if (!nextButton || await page.$eval('.pagination__el:has-text("Следующая →")', el => el.classList.contains('_disabled'))) {
				isContinue = false;
			}

			await nextButton.click();
			await page.waitForTimeout(2000);
		}

		clearInterval(timer); // Останавливаем таймер
		console.timeEnd('Parser');
		console.log(`${products.length} товаров собрано`);

		const space = 2;
		const name = fileName + '.json';
		await fs.writeFile(name, JSON.stringify(products, null, space));
		console.log(`Результаты сохранены в файл ${name}`);
		await browser.close();

	} catch (error) {
		console.log(`Ошибка подключения! ${error}`);
	}
}
