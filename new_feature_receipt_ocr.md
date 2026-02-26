# Feature Request: Automated Transaction Entry via Receipt OCR

## 🛑 Level: Difficult

## 📝 Description
Manually entering every single transaction is the biggest barrier to consistent budgeting for students. This feature proposes a "Scan Receipt" button that uses Optical Character Recognition (OCR) to automatically extract the date, merchant name, total amount, and items from a photo of a receipt.

Students can just snap a picture of their grocery or cafe receipt, and WalletWise will do the rest.

**Key Requirements**:
- **Image Upload Pipeline**: Securely upload images to Cloudinary or AWS S3.
- **OCR Engine Integration**: Integrate with a service like Tesseract.js (client-side) or Google Cloud Vision / AWS Textract (server-side).
- **Data Extraction Logic**: Parse raw text to identify key patterns (e.g., symbols like $, "Total:", Date formats).
- **Review UI**: Allow users to confirm and correct the extracted data before saving the transaction.

## 🛠️ Implementation Plan

### Backend Changes
1. **Multer Setup**: Ensure backend can handle image uploads (already partially exists but needs tuning for OCR).
2. **OCR Service Layer**: Implement a utility file `backend/utils/ocrService.js` that sends images to an external API or runs Tesseract locally.
3. **Smart Parsing**: Create a regex-based or NLP-based parser to normalize raw OCR output into a Transaction object.
4. **Cloud Storage**: Implement Cloudinary integration for temporary or permanent receipt storage.

### Frontend Changes
1. **Camera Integration**: Use `react-webcam` or native file inputs to capture photos.
2. **Processing State**: A beautiful "Scanning..." animation while the OCR runs.
3. **Confirmation Modal**: A side-by-side view showing the Image and the Extracted Data for quick editing.

### Performance Consideration
- OCR can be slow. Use background processing or optimistic UI to keep the app feeling fast.

## 🧪 Acceptance Criteria
- [ ] User can upload a JPG/PNG of a standard receipt.
- [ ] System extracts "Amount" with >90% accuracy for clear photos.
- [ ] Extracted category is intelligently guessed based on merchant name.
- [ ] Transaction is saved with the original receipt image attached for future reference.
