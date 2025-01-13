const { chromium, firefox, webkit } = require('playwright');
const { execSync } = require('child_process');


// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
];


//zrestartuj Tor
async function restartTor(){
        try {
            console.log("Restartowanie Tora...");
            execSync('sudo systemctl restart tor');
            console.log("Tor został zrestartowany.");
        } catch (error) {
            console.error("Błąd podczas restartowania Tora:", error.message);
        }
}


//wylosuj przeglądarkę i userAgent
async function randomBrowserType() {
  const browserTypes = [
    { name: 'chromium', type: chromium },
    { name: 'firefox', type: firefox },
    { name: 'webkit', type: webkit },
  ];
  
  const randomBrowser = browserTypes[Math.floor(Math.random() * browserTypes.length)];
  return randomBrowser; // Zwraca obiekt z nazwą i typem przeglądarki
}


async function randomUserAgent(){
	const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
	return userAgent;
}




// Eksport funkcji
module.exports = {
  restartTor,
  randomBrowserType,
  randomUserAgent,
};

