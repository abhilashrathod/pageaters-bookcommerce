# Payment Life Cycle

## Created

A payment is created when the customer fills up and submits the payment information and it is sent to Razorpay. No processing has been done on the payment at this stage.

## Authorized

Authorization is performed when customer's payment details are successfully authenticated by the bank. The money is deducted from the customer’s account by Razorpay, but will not be settled to your account until the payment is captured, either manually or automatically.

There can be scenarios when a payment is interrupted by external factors such as network issues or technical errors at customer's or bank's end. In such cases, money may get debited from the customer's bank account but Razorpay does not receive a payment status from the bank. This is termed as Late Authorization and you can learn more about how to handle this at your end.
Late Authorization[https://razorpay.com/docs/payment-gateway/payments/late-authorization/]

## Captured

When the status of the payment is changed to captured, the authorized payment is verified as complete by Razorpay. After the capture, the amount is settled to your account as per the settlement schedule of the bank. The captured amount must be the same as the authorized amount. Any authorization not followed by a capture within 5 days is automatically voided and the amount is refunded to the customer.

## Refunded
You can refund the payments that have been successfully captured at your end. The amount is sent back to the customer's account.

## Failed
Any unsuccessful transaction is marked as failed and the customer will have to retry the payment.


# Payment Flow

## 1 Customers Place an Order
A customer visits your website or app, selects items they want to purchase and places an order. For each order placed by your customer, create a `transaction_id` or `checkout_id` on your server for your reference. For example, `#trn-369`.


## 2 Create Order on Server
For each order placed by your customer, use the Razorpay Orders API to create an order from your Server. You do this using Razorpay Orders API.

Razorpay processes the details sent and returns an `order_id` to you, for example, `order_EKwxwAgItmmXdp`. Map this `order_id` to the `transaction_id #trn-345`, you had created in the previous step.


Read more: Order Life Cycle [https://razorpay.com/docs/payment-gateway/orders/#order-life-cycle]

Read more: Order API [https://razorpay.com/docs/api/orders/]

##3. Pass Order ID to the checkout and collect payment details

Pass the `order_id` returned by Razorpay to your Checkout. This invokes the Checkout allowing your customer to make the payment using your client-side integration.

The customer selects the appropriate payment method, clicks Pay and completes the payment. The payment details entered by the customer are sent to the Razorpay servers. The payment details submitted are secured and stored by Razorpay as tokens. The generated tokens are exchanged with your servers for further use.

## 4. Authentication of a payment

Internally, Razorpay sends an authentication request to the customer's bank. After appropriate authentication, Razorpay is authorized to deduct the amount from the customer's bank account.
    
For successful payments, the Checkout returns the following:
    
```
razorpay_order_id

razorpay_payment_id

razorpay_signature
```

Read More Above for Payment Life Cycle [https://razorpay.com/docs/payment-gateway/payments/#payment-life-cycle]

##5. Capture the payment

Once your customer completes the payment and Razorpay authenticates it, you must capture the payment. You can either:

- Auto-capture payments.
- Manually capture payments.

Read more: Learn more about Payment Capture Settings. [https://razorpay.com/docs/payment-gateway/payments/capture-settings/]

You can also verifying the payment signature. This allows you to ensure that the payment is received from an authentic source.




## 5A: Settlements
After a payment successful captured, the amount is settled to your account according to your settlement schedule.
       
Learn more about Settlements [https://razorpay.com/docs/payment-gateway/settlements/]

## 5B: Refunds

After the funds are settled to your account, customers could request for a refund. In such cases, you can initiate a refund and the funds are sent back to the customer's account.

There could be situations when customers request a refund of the payments made for the products or services purchased or availed on your website or app.

Depending on the time that you wish the refunds to be processed for your customers, you can opt either for:

- Normal Refunds where it takes 5-7 working days for the refunds to reach your customers.
- Instant Refunds where the customers receive their amount almost immediately.
By issuing instant refunds to your customers, you can provide a better user experience for them. This also helps in improving their reliability and trust in your business.

Read More: https://razorpay.com/docs/payment-gateway/refunds/




