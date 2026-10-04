/**
 * @desc    Handle receipt/avatar upload via Multer (and optionally Cloudinary)
 * @route   POST /api/v1/upload/receipt
 * @access  Private
 */
export const uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a file');
    }

    // Assuming we use Cloudinary or local storage and file path/URL is in req.file.path
    res.status(200).json({
      success: true,
      data: {
        url: req.file.path,
        publicId: req.file.filename,
      }
    });
  } catch (error) {
    next(error);
  }
};
