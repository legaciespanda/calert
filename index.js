const puppeteer = require("puppeteer");
const fs = require('fs');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require("dotenv");
dotenv.config();
require('log-timestamp');

// Replace with your bot's token and chat ID
const TELEGRAM_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_TOKEN);

// File to store sent messages
const SENT_MESSAGES_FILE = 'sentMessages.json';

// Function to load sent messages
const loadSentMessages = () => {
  if (fs.existsSync(SENT_MESSAGES_FILE)) {
      try {
          const data = fs.readFileSync(SENT_MESSAGES_FILE, 'utf-8');
          return JSON.parse(data);
      } catch (error) {
          console.error('Error parsing JSON file:', error);
          return [];
      }
  }
  return [];
};

// Function to save sent messages
const saveSentMessages = (messages) => {
  fs.writeFileSync(SENT_MESSAGES_FILE, JSON.stringify(messages, null, 2));
};

// Function to send a message and track it
const sendMessage = (message, msgIdentifier) => {
  const messages = loadSentMessages();

  // Check if the message has already been sent
  if (!messages.includes(msgIdentifier)) {
      bot.sendMessage(CHAT_ID, message)
          .then(() => {
              messages.push(msgIdentifier);
              saveSentMessages(messages);
              console.log(`Message sent`);
          })
          .catch((error) => {
              console.error(`Failed to send message: ${error.message}`);
          });
  } else {
      console.log('Message has already been sent, skipping.');
  }
};

const main = async ()=>{

   console.log("Welcome to Code Alert 🚀 \n Searching codecanyon for newly listed products....");
  // Initiate the browser 
	const browser = await puppeteer.launch(); 
	 
	// Create a new page with the default browser context 
	const page = await browser.newPage(); 

    // Set the navigation timeout to 60 seconds
    page.setDefaultNavigationTimeout(600000);
 
	// Go to the target website 
	await page.goto(process.env.ALL_PRODUCT_CATEGORIES ? `https://codecanyon.net/search?date=this-month&sort=date` : `https://codecanyon.net/category/${process.env.PRODUCT_CATEGORY}?sort=date`); 


  // Find all the specified HTML elements and extract the links
  const links = await page.evaluate(() => {
    const stationElements = document.getElementsByClassName('shared-item_cards-list-image_card_component__itemLinkOverlay');
    return Array.from(stationElements).map(stationElement => {
      if (stationElement) {
        return stationElement.getAttribute('href');
      }
      return null;
    });
  });

    // Navigate to each link
for (const link of links) {
     //console.log(link)
    if (link) {
        await page.goto(link, { waitUntil: 'networkidle0' });
        //console.log(`Navigated to: ${link}`);

        const extractedDate = await page.evaluate(() => {
            const dateData = document.getElementsByClassName('updated');
            return Array.from(dateData).map(link => link.getAttribute('datetime').toString());
        });

        const productTitle = await page.evaluate(() => {
          const metaTitle = document.querySelector('meta[property="og:title"]');
          const productTitle = metaTitle ? metaTitle.getAttribute('content') : null;
          return productTitle;
        });

        const productPrice = await page.evaluate(() => {
          const metaPrice = document.querySelector('meta[name="twitter:data1"]');
          const productPrice = metaPrice ? metaPrice.getAttribute('content') : null;
          return productPrice;
        });


        const itemDetails = `
🚀New Codecanyon Product Alert!🚀

PRODUCT DETAILS:
✏️Product Name: ${productTitle}

💱Amount: ${productPrice}

🌐Purchase Link: ${link}

📅Date Created: ${extractedDate}
`;

        const inputDate = new Date(extractedDate);
        const today = new Date();

        const isEqual = inputDate.toDateString() === today.toDateString();
        if(isEqual){
          console.info("New Codecanyon product");
          console.log(itemDetails)
          sendMessage(itemDetails, productTitle);
          //return;
        }
        
        // else{
        //   console.info("No New Codecanyon product for today");
        //   return;
        //   //console.log(itemDetails)

        // }
       

        //console.log(extractedDate);
    }
}

  //console.log(link);
 
	// Get pages HTML content 
	//const content = await page.content(); 
	//console.log(content); 
 
	// Closes the browser and all of its pages 
	await browser.close(); 
}


// Schedule the job to run every 10 minutes
schedule.scheduleJob(`*/${process.env.SCHEDULE_JOB} * * * *`, main);

main();
