import express from 'express';
import { parser } from './parser.js';
import fs from 'fs';

const app = express();
const port = 7777;

app.use(express.json());

app.post('/api/parser/', async (req, res) => {
	const { email, password, fileName } = req.body;
	const filePath = fileName + '.json';
	fs.access(filePath, fs.constants.F_OK, (err) => {
		if (err) {
			console.log('File does not exist');
		} else {
			fs.unlink(filePath, (err) => {
				if (err) throw err;
			});
		}
	});
	try {
		parser(email, password, fileName);
		res.json('Parsing has begun');
	} catch (error) {
		console.log(error);
	}
});

app.get('/api/get-products/', (req, res) => {
	const { fileName } = req.query;
	const name = fileName + '.json';

	fs.access(name, fs.constants.F_OK, (err) => {
		if (err) {
			return res.send('The file doesnt exist yet, please try again later');
		} else {
			fs.readFile(name, (err, data) => {
				if (err) throw err;

				const jsonData = JSON.parse(data);
				res.json(jsonData);
			});
		}
	});
});

app.listen(port, () => {
	console.log(`Server started on port ${port}`);
});
