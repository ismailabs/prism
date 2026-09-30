begin;
-- Cover all owner/currency relationship columns, including existing links, and
-- remove the newly introduced duplicate of the immutable baseline page index.
drop index public.transactions_financial_page;
drop index public.categories_owner_id;
create index repayment_debt_currency on public.debt_repayments(user_id,debt_id,currency);
create index repayment_transaction_currency on public.debt_repayments(user_id,transaction_id,currency);
create index repayment_account_currency on public.debt_repayments(user_id,account_id,currency);
create index budget_category_type on public.monthly_budgets(user_id,category_id,category_type);
create index contribution_account_currency on public.objective_contributions(user_id,account_id,currency);
create index contribution_transfer_currency on public.objective_contributions(user_id,transfer_id,currency);
create index contribution_objective_currency on public.objective_contributions(user_id,objective_id,currency);
create index contribution_transaction_currency on public.objective_contributions(user_id,transaction_id,currency);
create index recurring_account_currency on public.recurring_rules(user_id,account_id,currency);
create index transfer_destination_currency on public.transfers(user_id,destination_account_id,destination_currency);
create index transfer_source_currency on public.transfers(user_id,source_account_id,source_currency);
commit;
