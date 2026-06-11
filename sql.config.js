/**
 * SQL QUERY TEMPLATES
 * ===================
 * Add your saved queries here. Each will appear as a one-click button.
 * Use the placeholder {{IN}} exactly where you want the values injected.
 *
 * Fields:
 *   id      {string}  Unique ID
 *   label   {string}  Button label shown in the UI
 *   query   {string}  Full SQL with {{IN}} as the placeholder
 */

const SQL_TEMPLATES = [

  {
    id: 'stock_serial',
    label: 'Stock by serial_number',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE serial_number IN ({{IN}});`,
  },

  {
    id: 'stock_id',
    label: 'Stock by stock_id',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE stock_id IN ({{IN}});`,
  },

  {
    id: 'stock_vc',
    label: 'Stock by vc_number',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE vc_number IN ({{IN}});`,
  },

{
  id: 'update_trash',
  label: 'Mark as trashed',
  query:
  `UPDATE eb_stock
  SET is_trash = 1, trashed_date = NOW()
  WHERE serial_number IN ({{IN}});`,
  },
  
  // ── Add more queries below ─────────────────────────────────────────────────
  //
  // {
  //   id: 'delete_stock',
  //   label: 'Delete stock',
  //   query:
  // `DELETE FROM eb_stock
  // WHERE serial_number IN ({{IN}});`,
  // },
  //
  // {
  //   id: 'update_trash',
  //   label: 'Mark as trashed',
  //   query:
  // `UPDATE eb_stock
  // SET is_trash = 1, trashed_date = NOW()
  // WHERE serial_number IN ({{IN}});`,
  // },

];
