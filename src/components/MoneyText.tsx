import { Fragment } from "react";

// Only control line breaks in an already formatted amount. Keep the currency/sign
// with the first group and never split a group of digits or the decimal fraction.
export function MoneyText({ text }: { text: string }) {
  const groups = text.split(",");
  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={index}>
          <span className="money-group">
            {group}
            {index < groups.length - 1 ? "," : ""}
          </span>
          {index < groups.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
