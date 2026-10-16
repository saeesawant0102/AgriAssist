import { PAGINATION } from '../config/constants.js';

/**
 * Parses and sanitizes keyset pagination query params.
 * @param {{ limit?: string | number, cursor?: string | number }} query
 * @returns {{ limit: number, cursor: number | null }}
 */
export function parsePagination(query = {}) {
  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit <= 0) {
    limit = PAGINATION.DEFAULT_LIMIT;
  } else if (limit > PAGINATION.MAX_LIMIT) {
    limit = PAGINATION.MAX_LIMIT;
  }

  let cursor = null;
  if (query.cursor !== undefined && query.cursor !== null && query.cursor !== '') {
    const parsedCursor = parseInt(query.cursor, 10);
    if (!Number.isNaN(parsedCursor) && parsedCursor > 0) {
      cursor = parsedCursor;
    }
  }

  return { limit, cursor };
}

/**
 * Formats data and next_cursor for keyset paginated responses.
 * @template T
 * @param {T[]} items - Fetched items (usually fetched with limit + 1)
 * @param {number} limit - Requested page limit
 * @param {string} [idKey='id'] - Key representing the primary key ID
 * @returns {{ data: T[], next_cursor: number | null }}
 */
export function paginate(items, limit, idKey = 'id') {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const next_cursor = hasMore && data.length > 0 ? data[data.length - 1][idKey] : null;

  return {
    data,
    next_cursor,
  };
}
