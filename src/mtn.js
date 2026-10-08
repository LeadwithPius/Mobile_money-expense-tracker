const NUM = "([\\d,]+(?:\\.\\d{1,2})?)";
const toCents = (s) => Math.round(parseFloat(s.replace(/,/g, "")) * 100);

const START = /^Y[’']ello\./i;
const PAYMENT = new RegExp(
  `Payment of ZMW ${NUM} to (.+?) successful at (\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2})`
);
const BALANCE = new RegExp(`Your new balance: ${NUM} ZMW`);
const TX_ID = /Financial Transaction ID: (\d+)/;

export function parseMtn(text) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!START.test(t)) return null;

  const pay = t.match(PAYMENT);
  const id = t.match(TX_ID);
  if (!pay || !id) return null;

  const balance = t.match(BALANCE);
  return {
    provider: "mtn",
    currency: "ZMW",
    referenceCode: id[1],
    type: "payment",
    amount: toCents(pay[1]),
    fee: 0, 
    balanceAfter: balance ? toCents(balance[1]) : null,
    counterparty: pay[2].trim(),
    occurredAt: `${pay[3]}T${pay[4]}+02:00`, 
  };
}