-- The app_pages_schema migration (20260930000000) created tables, views
-- and RLS policies, but on this hosted project RLS alone isn't enough --
-- newer Supabase projects don't auto-grant base table/view access the way
-- local dev stacks do. Same gap we hit with hospital_login_secrets and the
-- dashboard schema; this fills it for the app-pages tables and views.

grant select, insert, update, delete on public.activity_logs to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.purchase_order_items to authenticated;
grant select, insert, update, delete on public.reports to authenticated;

grant select on
  public.user_stats,
  public.medicine_inventory,
  public.transaction_feed,
  public.purchase_order_stats,
  public.supplier_directory,
  public.monthly_expenditure,
  public.inventory_value_by_category,
  public.supplier_performance,
  public.stock_turnover_monthly
  to authenticated;