import Category from '../models/Category.js';

/**
 * @desc    Get all categories
 * @route   GET /api/v1/categories
 * @access  Private
 */
export const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;

    const query = {
      $or: [{ userId: req.user._id }, { isDefault: true }]
    };

    if (type) {
      query.$and = [
        { $or: [{ type: type }, { type: 'both' }] }
      ];
    }

    const categories = await Category.find(query).sort({ isDefault: -1, name: 1 });

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a custom category
 * @route   POST /api/v1/categories
 * @access  Private
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, icon, color, type } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Category name is required');
    }

    // Check if category exists for user or in defaults
    const exists = await Category.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      $or: [{ userId: req.user._id }, { isDefault: true }]
    });

    if (exists) {
      res.status(400);
      throw new Error('Category already exists');
    }

    const category = await Category.create({
      name,
      icon,
      color,
      type: type || 'both',
      userId: req.user._id,
      isDefault: false
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a category
 * @route   PUT /api/v1/categories/:id
 * @access  Private
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    if (category.isDefault) {
      res.status(403);
      throw new Error('Cannot update default categories');
    }

    if (category.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/v1/categories/:id
 * @access  Private
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    if (category.isDefault) {
      res.status(403);
      throw new Error('Cannot delete default categories');
    }

    if (category.userId.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('User not authorized');
    }

    await category.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
