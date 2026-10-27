# Orders

## Order Lifecycle

### `created`

When you create an order it is in the created state. It stays in this state till a payment is attempted on it.

### `attempted`

An order moves from created to attempted state when a payment is first attempted on it. It remains in the attempted state till one payment associated with that order is captured.

### `paid`

After the successful capture of the payment, the order moves to the paid state. No further payment requests are permitted once the order moves to the paid state. The order stays in this state even if the payment associated with the order is refunded.


