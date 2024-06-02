const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = 5000;

const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59",
];

const getRandomUserAgent = () => {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const fetchPage = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': getRandomUserAgent()
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        throw error;
    }
};

const scrapeAmazon = async (query) => {
    try {
        const searchPageData = await fetchPage(`https://www.amazon.com/s?k=${query}&i=electronics`);
        const $ = cheerio.load(searchPageData);
        const productDetails = [];

        $('.s-main-slot .s-result-item').each((index, element) => {
            const priceWhole = $(element).find(".a-price-whole").text();
            const priceFraction = $(element).find(".a-price-fraction").text();
            const price = priceWhole + priceFraction;
            const link = $(element).find('.a-link-normal').attr('href');
            const title = $(element).find('h2 .a-text-normal').text();

            if (price && link && title) {
                const priceInCOP = (parseFloat(price.replace(',', '')) * 3750).toLocaleString('en-US', { style: 'currency', currency: 'COP' });
                productDetails.push({
                    site: 'Amazon',
                    title: title,
                    price: priceInCOP,
                    link: `https://www.amazon.com${link}`,
                });
            }
        });

        return productDetails;
    } catch (error) {
        console.error('Error scraping Amazon:', error.message);
        return [{ site: 'Amazon', title: 'N/A', price: 'N/A', link: '#', description: 'N/A', specifications: 'N/A', availability: 'N/A' }];
    }
};

const scrapeMercadoLibre = async (query) => {
    try {
        const searchPageData = await fetchPage(`https://listado.mercadolibre.com.co/${query}`);
        const $ = cheerio.load(searchPageData);
        const productDetails = [];

        $('.ui-search-layout__item').each((index, element) => {
            const price = $(element).find('.andes-money-amount__fraction').first().text().replace('.', '');
            const link = $(element).find('a.ui-search-item__group__element.ui-search-link').attr('href');
            const title = $(element).find('.ui-search-item__title').text();

            if (price && link && title) {
                let formattedPrice = parseInt(price);
                if (formattedPrice < 10000) {
                    formattedPrice *= 1000;
                }
                formattedPrice = formattedPrice.toLocaleString('en-US', { style: 'currency', currency: 'COP' });

                productDetails.push({
                    site: 'Mercado Libre',
                    title: title,
                    price: formattedPrice,
                    link: link,
                });
            }
        });

        return productDetails;
    } catch (error) {
        console.error('Error scraping Mercado Libre:', error.message);
        return [{ site: 'Mercado Libre', title: 'N/A', price: 'N/A', link: '#' }];
    }
};

const scrapeFalabella = async (query) => {
    try {
        const searchPageData = await fetchPage(`https://www.falabella.com.co/falabella-co/search?Ntt=${query}`);
        const $ = cheerio.load(searchPageData);
        const productDetails = [];

        $('.jsx-1484439449.grid-pod').each((index, element) => {
            
            const price = $(element).find('.line-height-22').text();
            const link = $(element).find('a.pod-link').attr('href');
            const title = $(element).find('.pod-subTitle').text();

            if (price && link && title) {
                const formattedPrice = parseInt(price).toLocaleString('en-US', { style: 'currency', currency: 'COP' });

                productDetails.push({
                    site: 'Falabella',
                    title: title,
                    price: formattedPrice,
                    link: `https://www.falabella.com.co${link}`,
                });
            }
        });

        return productDetails;
    } catch (error) {
        console.error('Error scraping Falabella:', error.message);
        return [{ site: 'Falabella', title: 'N/A', price: 'N/A', link: '#' }];
    }
};

const scrapeTemu = async (query) => {
    try {
        const searchPageData = await fetchPage(`https://www.temu.com/search_result.html?search_key=${query}`);
        const $ = cheerio.load(searchPageData);
        const productDetails = [];
        const list =  $('.Ois68FAW._3qGJLBpe._2Y2Y4-8H').text();
        console.log(`list ${list}`);
        console.log(`hello`);

        $('.Ois68FAW _3qGJLBpe._2Y2Y4-8H').each((index, element) => {
            const price = $(element).find('._2de9ERAH').text();
            const link = $(element).find('a').attr('href');
            const title = $(element).find('h2').text();
            console.log(`Title ${title}`);
            console.log(`price ${price}`);
            console.log(`link ${link}`);


            if (price && link && title) {
                const formattedPrice = parseInt(price).toLocaleString('en-US', { style: 'currency', currency: 'COP' });

                productDetails.push({
                    site: 'Temu',
                    title: title,
                    price: formattedPrice,
                    link: `https://www.temu.com${link}`,
                });
            }
        });

        return productDetails;
    } catch (error) {
        console.error('Error scraping Temu:', error.message);
        return [{ site: 'Temu', title: 'N/A', price: 'N/A', link: '#' }];
    }
};

app.get('/search', async (req, res) => {
    const { query } = req.query;
    let results = [];

    // Scrape Amazon
    const amazonResults = await scrapeAmazon(query);
    results = results.concat(amazonResults);

    // Scrape Mercado Libre
    const mercadoLibreResults = await scrapeMercadoLibre(query);
    results = results.concat(mercadoLibreResults);

    // Scrape Falabella
    const falabellaResults = await scrapeFalabella(query);
    results = results.concat(falabellaResults);

    // Scrape Temu
    const temuResults = await scrapeTemu(query);
    results = results.concat(temuResults);

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
