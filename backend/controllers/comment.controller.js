import sanitizeHtml from "sanitize-html";
import * as commentModel from "../models/comment.model.js";

export async function listComments(req, res) {
  const productId = parseInt(req.params.productId, 10);
  const comments = await commentModel.getCommentsForProduct(productId);
  res.json(comments);
}

export async function addComment(req, res) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const userId = req.user?.id || null;
    const content = sanitizeHtml(req.body.content, { allowedTags: [], allowedAttributes: {} });
    const rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
    const comment = await commentModel.addComment({ productId, userId, content, rating });
    res.status(201).json(comment);
  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ error: "Error añadiendo comentario" });
  }
}
