import FileUpload from 'express-fileupload'
import { PDFDocument } from 'pdf-lib'
import { Readable } from 'stream'

// Initializing fileUpload middleware
const fileUpload = FileUpload({
    createParentPath: true
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

async function handler(req, res) {
  // Run the middleware
  await runMiddleware(req, res, fileUpload)

  try {
      if(!req.files) {
          res.send({
              status: false,
              message: 'No file uploaded'
          });
      } else {
          // pdf file to be signed
          let pdfFile = req.files.pdf
          // signature png file
          let signatureFile = req.files.signature

          // load pdf data
          const pdfDoc = await PDFDocument.load(pdfFile.data)
          
          // Embed the PNG image bytes
          const pngImage = await pdfDoc.embedPng(signatureFile.data)
          
          // Get the width/height of the PNG image scaled down to 50% of its original size
          const pngDims = pngImage.scale(0.5)

          // Add a blank page to the document
          const page = pdfDoc.getPage(pdfDoc.getPageCount()-1)

          // Draw the PNG image near the lower right corner of the JPG image
          page.drawImage(pngImage, {
            x: page.getWidth() / 2 - pngDims.width / 2 + 150,
            y: page.getHeight() / 2 - pngDims.height - 10,
            width: pngDims.width,
            height: pngDims.height
          })

          // Serialize the PDFDocument to bytes (a Uint8Array)
          const pdfBytes = await pdfDoc.save()

          console.log(pdfBytes)

          if (pdfBytes) {
              // Content-type is very interesting part that guarantee that
              // Web browser will handle response in an appropriate manner.
              res.writeHead(200, {
                  "Content-Type": pdfFile.mimetype,
                  "Content-Disposition": "attachment; filename=" + encodeURIComponent(pdfFile.name)
              })

              const buffer = new Buffer(pdfBytes)
              const readable = new Readable()
              readable._read = () => {} // _read but the data is already in memory
              readable.push(buffer)
              readable.push(null)

              readable.pipe(res)
              return
          }
          res.writeHead(400, { "Content-Type": pdfFile.mimetype })
          res.end("Something went wrong with " + pdfFile.name)
      }
  } catch (err) {
      console.log(err)
      res.status(500).send(err)
  }
}

export default handler