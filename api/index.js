const PDFDocument = require('pdf-lib')
const fs = require('fs')
const path = require('path')
const {google} = require('googleapis')
const dotenv = require('dotenv')


// folder to sign on google drive
//const folder = process.argv.slice(2)[0]
const folder = 'sign-pdf'

dotenv.config()

// retrieve file from google drive 108g_k7PDpMNY_LIFPBxZx3_MlMUrCoNa

//const pngImageBytes = fs.readFileSync(path.resolve('api/media', 'signature.png'))
// const pngImageBytes = fs.readFileSync(path.resolve('api/media', 'signature.png'))

async function signPdf(file) {
    if(path.extname(file) !== '.pdf') return

    const existingPdfBytes = fs.readFileSync(path.resolve(folder, file))

    // load existing pdf
    const pdfDoc = await PDFDocument.load(existingPdfBytes)

    // Embed the PNG image bytes
    const pngImage = await pdfDoc.embedPng(pngImageBytes)

    // Get the width/height of the PNG image scaled down to 50% of its original size
    const pngDims = pngImage.scale(0.5)

    // Add a blank page to the document
    const page = pdfDoc.getPage(pdfDoc.getPageCount()-1)

    // Draw the PNG image near the lower right corner of the JPG image
    page.drawImage(pngImage, {
      x: page.getWidth() / 2 - pngDims.width / 2 + 200,
      y: page.getHeight() / 2 - pngDims.height - 60,
      width: pngDims.width,
      height: pngDims.height,
    })

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(path.resolve(folder, file), pdfBytes)
}

// fs.readdirSync(folder).forEach(file => {
//     console.log(file)
//     signPdf(file)
// })

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json'

const credentials = {
    "web": {
        "client_id":process.env.CLIENT_ID,
        "project_id":"dr-kit",
        "auth_uri":"https://accounts.google.com/o/oauth2/auth",
        "token_uri":"https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
        "client_secret":process.env.CLIENT_SECRET,
        "redirect_uris":["https://dr-kit.vercel.app/api/index"],
        "javascript_origins":["https://dr-kit.vercel.app"]
    }
}

const {client_secret, client_id, redirect_uris} = credentials.web
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles() {
  const drive = google.drive({version: 'v3', oAuth2Client});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  });
}

function createFile() {
    const drive = google.drive({version: 'v3', oAuth2Client});
    const res = drive.files.create({
        requestBody: {
            name: 'Test',
            mimeType: 'text/plain'
        },
        media: {
            mimeType: 'text/plain',
            body: 'Hello World'
        }
    });
}

function retrieveFileBytes(file) {
    //
}

async function main(req, res) {
    // generate and set token
    if(req.query && req.query.code) {
        oAuth2Client.setCredentials(await oAuth2Client.getToken(req.query.code))
    }
    else {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        })
        res.writeHeader(200, {"Content-Type": "text/html"})
        res.write('<script>window.location.href="' + authUrl + '"</script>')
        res.end()
        return
    }

    console.log("Authorized!")
    const drive = google.drive({version: 'v3', oAuth2Client});
    const files = await drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
    })
    console.log(files)
    console.dir(files)
    res.writeHeader(200, {"Content-Type": "text/html"})
    res.write('<body>' + files + '</body>')
    res.end()
}

module.exports = main