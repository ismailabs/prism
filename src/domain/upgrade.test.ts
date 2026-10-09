import { clearPrivateQueries } from "@/lib/privateCache";
import type { Account, Transaction, Transfer } from "@/types";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardFinancials } from "./dashboard";
import { financialDate, financialDateTime, financialInstant } from "./dates";
import { accountBalance } from "./progress";
import { transactionTransport } from "./transport";
import {formatCurrency} from '@/services/currency';
import {parseMoney} from './money';
afterEach(() => vi.useRealTimers());
const tx: Transaction = {
  id: "tx",
  user_id: "user",
  amount: "90071992547409.93",
  currency: "MYR",
  type: "expense",
  category_id: null,
  payment_method_id: null,
  description: "Test",
  transaction_date: "2026-09-29T17:00:00Z",
  created_at: "",
};
describe("financial foundations transport and reporting", () => {
  it('orders native spending categories exactly when floating-point values would tie',()=>{
    vi.useFakeTimers().setSystemTime('2026-09-30T12:00:00Z');const categories=[{id:'a',user_id:'u',name:'Smaller',type:'expense' as const,color:'#111111',created_at:''},{id:'b',user_id:'u',name:'Larger',type:'expense' as const,color:'#222222',created_at:''}];
    const result=dashboardFinancials([{...tx,category_id:'a'},{...tx,id:'b',category_id:'b',amount:'90071992547409.94'}],categories,'2026-09','MYR',null,'UTC','en','Other');expect(result.breakdown[0].name).toBe('Larger');
  });
  it('matches the database individual native-amount cap for JPY',()=>{expect(parseMoney('9999999999999999','JPY')).toBe(9999999999999999n);expect(()=>parseMoney('10000000000000000','JPY')).toThrow('supported range');});
  it('preserves aggregate totals beyond the individual-entry cap and a one-cent net flow',()=>{
    vi.useFakeTimers().setSystemTime('2026-09-30T12:00:00Z');
    const result=dashboardFinancials([],[],'2026-09','MYR',null,'UTC','en','Other',{monthly:[{user_id:'u',month:'2026-09',currency:'MYR',type:'income',category_id:null,amount:'18014398509481985.00',transaction_count:2},{user_id:'u',month:'2026-09',currency:'MYR',type:'expense',category_id:null,amount:'18014398509481984.99',transaction_count:2}],net:[]});
    expect(result.netMagnitude).toBe('0.01');expect(result.positiveFlow).toBe(true);expect(formatCurrency(result.incomeExact,'MYR')).toContain('18,014,398,509,481,985.00');
  });
  it("rejects numeric transport and preserves native values beyond JS precision", () => {
    expect(transactionTransport.parse(tx).amount).toBe("90071992547409.93");
    expect(() =>
      transactionTransport.parse({
        ...tx,
        amount: Number("90071992547409.93"),
      }),
    ).toThrow();
    expect(() =>
      transactionTransport.parse({ ...tx, amount: "1.001" }),
    ).toThrow();
  });
  it('fails closed on non-positive, out-of-range and non-native transaction amounts', () => {
    for (const currency of ['MYR', 'USD', 'EUR', 'JPY'] as const) {
      const amount = currency === 'JPY' ? '9999999999999999' : '9999999999999999.99';
      expect(transactionTransport.parse({ ...tx, currency, amount }).amount).toBe(amount);
      for (const invalid of ['0', '-1', '10000000000000000', 'NaN', 'Infinity', '1e3'])
        expect(transactionTransport.safeParse({ ...tx, currency, amount: invalid }).success).toBe(false);
      expect(transactionTransport.safeParse({ ...tx, currency, amount: currency === 'JPY' ? '1.01' : '1.001' }).success).toBe(false);
    }
  });
  it("sums native dashboard amounts exactly and excludes legacy principal/allocations", () => {
    vi.useFakeTimers().setSystemTime("2026-09-30T12:00:00Z");
    const result = dashboardFinancials(
      [
        tx,
        { ...tx, id: "small", amount: "0.10" },
        {
          ...tx,
          id: "legacy",
          amount: "100.00",
          activity_kind: "debt_principal",
        },
        {
          ...tx,
          id: "saved",
          amount: "100.00",
          activity_kind: "savings_allocation",
        },
      ],
      [],
      "2026-09",
      "MYR",
      null,
      "Asia/Kuala_Lumpur",
      "en",
      "Other",
    );
    expect(result.expenseExact).toBe("90071992547410.03");
    expect(result.balanceExact).toBe("-90071992547410.03");
  });
  it("moves exact cash between accounts with no same-currency net-worth change", () => {
    const a: Account = {
      id: "a",
      user_id: "user",
      name: "A",
      currency: "MYR",
      opening_balance: "1000.00",
      archived: false,
      created_at: "",
    };
    const b = { ...a, id: "b", opening_balance: "0.00" };
    const transfer: Transfer = {
      id: "move",
      user_id: "user",
      source_account_id: "a",
      destination_account_id: "b",
      source_amount: "10.01",
      destination_amount: "10.01",
      source_currency: "MYR",
      destination_currency: "MYR",
      occurred_at: "2020-01-01T00:00:00Z",
      note: "",
      created_at: "",
      updated_at: "",
    };
    expect(accountBalance(a, [], [transfer])).toBe("989.99");
    expect(accountBalance(b, [], [transfer])).toBe("10.01");
  });
});
describe("explicit financial timezone", () => {
  it("handles midnight, month and year boundaries independently of browser timezone", () => {
    expect(financialDate("2026-09-30T16:30:00Z", "Asia/Kuala_Lumpur")).toBe(
      "2026-10-01",
    );
    expect(financialDate("2026-01-01T00:30:00Z", "America/Los_Angeles")).toBe(
      "2025-12-31",
    );
    expect(financialDate("2026-12-31T23:30:00Z", "Pacific/Auckland")).toBe(
      "2027-01-01",
    );
  });
  it("round-trips financial wall time and rejects DST ambiguity/gaps", () => {
    expect(financialInstant("2026-09-30T23:15", "Asia/Kuala_Lumpur")).toBe(
      "2026-09-30T15:15:00.000Z",
    );
    expect(financialDateTime("2026-09-30T15:15:00Z", "Asia/Kuala_Lumpur")).toBe(
      "2026-09-30T23:15",
    );
    expect(() =>
      financialInstant("2026-03-08T02:30", "America/New_York"),
    ).toThrow();
    expect(() =>
      financialInstant("2026-11-01T01:30", "America/New_York"),
    ).toThrow();
  });
});
describe("private cache ownership changes", () => {
  it("clears both finance and platform families for all users while keeping public FX", () => {
    const client = new QueryClient();
    for (const id of ["alice", "bob"]) {
      client.setQueryData(["finance", id, "transactions"], [tx]);
      client.setQueryData(["platform", id, "accounts"], [{ secret: id }]);
    }
    client.setQueryData(["exchange-rates", "MYR"], { public: true });
    clearPrivateQueries(client);
    expect(client.getQueriesData({ queryKey: ["finance"] })).toEqual([]);
    expect(client.getQueriesData({ queryKey: ["platform"] })).toEqual([]);
    expect(client.getQueryData(["exchange-rates", "MYR"])).toEqual({
      public: true,
    });
  });
  it("a late cancelled read cannot restore the previous user cache", async () => {
    const client = new QueryClient();
    let finish: (value: unknown) => void = () => {};
    const request = client
      .fetchQuery({
        queryKey: ["platform", "alice", "accounts"],
        queryFn: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      })
      .catch(() => {});
    clearPrivateQueries(client);
    finish([{ secret: "alice" }]);
    await request;
    await Promise.resolve();
    expect(
      client.getQueryData(["platform", "alice", "accounts"]),
    ).toBeUndefined();
  });
});
