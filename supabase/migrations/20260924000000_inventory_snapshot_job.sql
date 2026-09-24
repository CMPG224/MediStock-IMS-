-- Daily snapshot of total units and value, used by the Inventory Trend chart.
create extension if not exists pg_cron;

select cron.schedule(
  'daily-inventory-snapshot',
  '55 23 * * *',
  $$
  insert into public.inventory_snapshots (snapshot_date, total_units, total_value)
  select current_date,
         coalesce(sum(quantity_on_hand), 0),
         coalesce(sum(quantity_on_hand * unit_price), 0)
  from public.medicines
  on conflict (snapshot_date) do update
    set total_units = excluded.total_units,
        total_value = excluded.total_value;
  $$
);