// src/utils/sanitizeHTML.js
import DOMPurify from "dompurify";

/**
 * sanitizeHTML(htmlString)
 * - Usa DOMPurify para limpiar cualquier HTML (scripts, on* handlers, etc).
 * - Devuelve HTML “seguro” listo para injectar con dangerouslySetInnerHTML
 */
export function sanitizeHTML(htmlString) {
  if (!htmlString) return "";
  // Configuración segura: no permitir tags peligrosos ni atributos on*
  return DOMPurify.sanitize(htmlString, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "a",
      "span",
      "h1",
      "h2",
      "h3",
    ],
    ALLOWED_ATTR: ["href", "rel", "target"],
  });
}

/**
 * sanitizeText(text)
 * - Para inputs de usuario: limpiamos HTML y devolvemos texto plano.
 * - Útil para comentarios: evita que usuario inyecte HTML.
 */
export function sanitizeText(text) {
  if (text == null) return "";
  // Eliminar tags y dejar texto plano
  const cleaned = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return cleaned;
}
