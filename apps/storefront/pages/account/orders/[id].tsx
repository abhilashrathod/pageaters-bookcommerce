import React, {useState} from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";
import Head from "next/head";
import Link from "next/link";
import useSWR, {mutate} from "swr";
import {Checkbox, Modal, Radio, RadioGroup, Stepper, Text, Textarea, Timeline} from '@mantine/core';
import {useNotifications} from "@mantine/notifications";
import {formList, useForm} from '@mantine/form';
import {Icon} from "@iconify/react";
import axios from "axios";
import moment from "moment";
import {get, startCase} from 'lodash';

import Breadcrumbs from "../../../components/elements/Breadcrumbs";
import PageHeadings from "../../../components/elements/PageHeadings";
import PageWrapper from "../../../components/elements/PageWrapper";
import EmptySectionMessage from "../../../components/elements/FailedToLoad";
import AppButton, {ButtonSizes, ButtonVariants} from "../../../components/form-controls/Button";
import AppIconButton from "../../../components/form-controls/IconButton";
import {InputWrapper} from "../../../components/form-controls/AppTextInput";

import {
  CANCELLATION_REASONS,
  LIGHT_COLOR,
  LIGHTER_PRIMARY_COLOR,
  LIGHTEST_PRIMARY_COLOR,
  ORDER_REQUEST_TYPES,
  ORDER_STAGES,
  PAYMENT_METHODS,
  PRIMARY_COLOR,
  RETURN_REASONS,
  SM,
  TRACKING_LINK
} from "../../../core/_variables";
import {currencyFormat, returnDiscountedAmount} from "../../../core/_helpers";
import {getBundleImage, getProductImage} from "../../../core/_imageRendererHelper";
import {IOrder, IOrderHistory} from "../../../schemas/order";

interface Props {
}

interface ShipmentActionProps {
  shipment: string;
}

interface CancelActionProps {
  orderId: string;
}

interface ReturnActionProps {
  orderId: string;
  type: string;
  books: Array<any>;
  bundles: Array<any>;
}

interface FeedbackModalProps {
  books: any[];
  bundles: any[];
  type: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
}

const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Orders', href: '/account/orders'},
  {title: activeItem.title, isActive: true, href: ''},
];

const OrderCard = styled.div`
  padding: 1.5rem;
  margin-bottom: 1.6rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  transition: all 0.5s ease;  
  
  &:hover {
    border: 1px solid ${LIGHTEST_PRIMARY_COLOR};
  }

  @media screen and (max-width: ${SM - 1}px) {
    padding: 0;
    margin: 0;
    padding-bottom: 0.825rem;
    margin-bottom: 0.825rem;
    border: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    
    &:hover {
      border: none;
    }
  }
`;

const Title = styled.h6`
  margin-bottom: 0;
`;

const PaymentList = styled.ul`
`;

const PaymentListItem = styled.li`
  margin-bottom: 0;
`;

const DeliveryAddress = styled.div`
  flex-direction: column;
  display: flex;
  margin-bottom: 1rem;
`;
const PaymentSummary = styled.div`
  margin-bottom: 1rem;
`;
const OrderBreakdown = styled.div`
  margin-bottom: 1rem;
`;

const AddressContactInfo = styled.span`
  color: ${LIGHTER_PRIMARY_COLOR};
  font-weight: 600;
`;

const OrderAmounts = styled.ul`
  margin-bottom: 1rem;
`;

const OrderAmountListItem = styled.li`
  position: relative;
  display: flex;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-width: 0 0 1px;
  margin: 0;
  line-height: 24px;
  justify-content: space-between;
  
  &:last-child {
    border: none;
  }
`;

const ProductList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ProductListItem = styled.li`
  margin: 1.25rem 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1.25rem;
  
  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
`;

const SubmitButton = styled.button`
  color: ${PRIMARY_COLOR};
  background: transparent;
  font-size: 1.2rem;
  line-height: 1.486rem;
  padding: 14px 24px;
  border-radius: 0.5rem;
  margin-bottom: 1.2rem;
  border: 1px solid ${LIGHTEST_PRIMARY_COLOR};
  box-shadow: 0 2px 10px 0 rgb(0 0 0 / 16%);
  width: 100%;
  display: block;
`;

export const Crossed = styled.span`
  margin-right: 0.5rem;
  text-decoration: line-through;
  color: ${LIGHT_COLOR};
`;

export const CartItem = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

export const CartContent = styled.div`
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: row;
`;

export const CartImage = styled.img`
  width: 75px;
  height: 100px;
  cursor: pointer;
  border-radius: 0.5rem;
  object-fit: cover;
  -webkit-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  -moz-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  
  @media screen and (max-width: ${SM - 1}px) {      
    width: 95px;
    height: 110px;
  }
`;

export const CartProductInfo = styled.div`
  margin-left: 1rem;
  width: 100%;
`;

export const CartProductTitle = styled.p`
  margin-bottom: 0;
  cursor: pointer;
  font-weight: 600;
`;

function returnPaymentBreakdown(payment: any) {
  switch (payment.method) {
    case PAYMENT_METHODS.CARD:
      return (<>
        <PaymentListItem>Via: {payment.method}</PaymentListItem>
        <PaymentListItem>Name: {payment.name}</PaymentListItem>
        <PaymentListItem>Card: {payment.network.toUpperCase()} {payment.last4}</PaymentListItem>
      </>);

    case PAYMENT_METHODS.NET_BAKING:
      return (<>
        <PaymentListItem>Via: {payment.method}</PaymentListItem>
        <PaymentListItem>Bank: {payment.bank}</PaymentListItem>
      </>);

    case PAYMENT_METHODS.UPI:
      return (<>
        <PaymentListItem>Via: {payment.method}</PaymentListItem>
        <PaymentListItem>UPI ID: {payment.upi_id}</PaymentListItem>
      </>);

    case PAYMENT_METHODS.COD:
      return (<>
        <PaymentListItem>Via: {'Cash on Delivery'}</PaymentListItem>
      </>);

    default:
      return (
          <>
            <li>No Info</li>
          </>
      )
  }
}

function FeedbackModal({type, open, books, bundles, onClose, onSubmit}: FeedbackModalProps) {
  const [active, setActive] = useState(0);

  function returnBundles() {
    return bundles.map((x: any, index: number) => {
      return {name: x.bundle.title, value: x.bundle._id, active: true}
    })
  }

  function returnBooks() {
    return books.map((x: any, index: number) => {
      return {name: x.product.title, value: x.product._id, active: true}
    })
  }


  const form = useForm({
    initialValues: {
      reason: '',
      comments: '',
      type: type,
      books: formList(returnBooks()),
      bundles: formList(returnBundles()),
    },

    // @ts-ignore
    validationRules: {
      reason: (value: string) => value !== '',
    },

    errorMessages: {
      reason: 'Please select a reason for return',
    },
  });

  const bookList = form.values.books.map((book: any, index: number) => (
      <li key={index} style={{display: 'flex', alignItems: 'center'}}>
        <Checkbox styles={{root: {display: 'inline-flex', marginRight: '0.5rem'}}} color={'gray'} radius={'xl'}
                  key={index} {...form.getListInputProps('books', index, 'active')} />
        <Text style={{color: PRIMARY_COLOR, fontSize: '1rem', fontWeight: 'normal', marginBottom: '0'}}
              component="span">{book.name}</Text>
      </li>
  ));

  const bundleList = form.values.bundles.map((bundle: any, index: number) => (
      <li key={index} style={{display: 'flex', alignItems: 'center'}}>
        <Checkbox styles={{root: {display: 'inline-flex', marginRight: '0.5rem'}}} color={'gray'} radius={'xl'}
                  key={index} {...form.getListInputProps('bundles', index, 'active')} />
        <Text style={{color: PRIMARY_COLOR, fontSize: '1rem', fontWeight: 'normal', marginBottom: '0'}}
              component="span">{bundle.name}</Text>
      </li>
  ));


  return (
      <Modal opened={open} size={'lg'} onClose={onClose} title={`${startCase(type)} Request`} closeOnClickOutside={false}>
        <h6>Our Sincere Apology. Please let us know what went wrong.</h6>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stepper color="gray" size="sm" active={active} onStepClick={setActive}>
            <Stepper.Step label={'Details about ' + type}>
              <InputWrapper>
                <RadioGroup
                    {...form.getInputProps('reason')}
                    label="Reason for Returning the order"
                    description=""
                    spacing="sm"
                    orientation="vertical"
                    color="gray"
                    styles={{
                      label: {color: PRIMARY_COLOR, fontSize: '1rem', fontWeight: 'normal', marginBottom: '0'},
                    }}
                    required>
                  <Radio value="Incorrect product" label="Incorrect product" />
                  <Radio value="No longer needed" label="No longer needed" />
                  <Radio value="Did not meet my expectations" label="Did not meet my expectations" />
                  <Radio value="Quality is not upto the mark" label="Quality is not upto the mark" />
                  <Radio value="It was damaged or defective" label="It was damaged or defective" />
                  <Radio value="Not delivered on time" label="Not delivered on time" />
                  <Radio value="Found a better deal elsewhere" label="Found a better deal elsewhere" />
                </RadioGroup>
              </InputWrapper>
              <InputWrapper>
                <Textarea
                    {...form.getInputProps('comments')}
                    placeholder=""
                    label="Comments"
                    description="This helps us understand how we failed to meet your expectations and how we can better serve you in the future."
                />
              </InputWrapper>
              <SubmitButton type={'button'} onClick={() => setActive(1)}>Next</SubmitButton>
            </Stepper.Step>
            <Stepper.Step label={'Select Products'}>
              <ul>
                {bookList}
                {bundleList}
              </ul>
              <SubmitButton type={'submit'}>Submit and {type}</SubmitButton>
            </Stepper.Step>
          </Stepper>
        </form>
      </Modal>
  )
}

const ShipmentAction = ({shipment}: ShipmentActionProps) => {
  const [open, setOpen] = useState(false);

  function handleAction() {
    if (!shipment) {
      setOpen(true);
    } else {
      // transfer to tracking website
      window.open(TRACKING_LINK(shipment));
    }
  }

  return (
      <>
        <AppButton variant={ButtonVariants.Accent} size={ButtonSizes.Large}
                   styles={{width: '100%', marginBottom: '0.5rem', display: 'block'}} onClick={handleAction}>
          {'Track Shipment'}
        </AppButton>
        <Modal opened={open} centered onClose={() => setOpen(false)} title="Help - Shipment">
          <p>
            {`Hey there, thank you for your order with us! Your order has been accepted, but we haven't sent it yet. Once
            we send it, you can track it using the link that will be available here soon.`}
          </p>
          <p>
            {`We will also notify you about this via email. Don't worry it won't take long!`}
          </p>
        </Modal>
      </>
  )
};

const CancelAction = ({orderId}: CancelActionProps) => {
  const notif = useNotifications();

  const [open, setOpen] = useState(false);


  const form = useForm({
    initialValues: {
      reason: '',
      comments: '',
      type: ORDER_REQUEST_TYPES.CANCEL,
      books: [],
      bundles: [],
    },

    validate: {
      reason: (value: string) => value === '' ? 'Please select a reason for cancellation' : null,
    },
  });

  async function handleSubmit(values: any) {
    try {
      await axios.post(`/orders/cancel/${orderId}`, values, {withCredentials: true});
      notif.showNotification({message: 'Order cancelled', color: 'green', autoClose: 3000});
      updateOrder();
      closeModal();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function updateOrder() {
    mutate({
      url: `/orders/getByUniqueId/${orderId}`,
      withCredentials: true
    });
  }

  function openModal() {
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  return (
      <>
        <AppIconButton variant={ButtonVariants.Danger} size={ButtonSizes.Large}
                       styles={{width: '100%', display: 'block'}}
                       onClick={openModal}>
          Cancel Order
        </AppIconButton>

        <Modal opened={open} size={'lg'} centered onClose={() => closeModal()} title="Cancel Order">
          <h6>{`Our Sincere Apology, if we could not meet your expectations. Please let us know why you're cancelling your order`}</h6>
          <div>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <InputWrapper>
                <RadioGroup
                    {...form.getInputProps('reason')}
                    label="Reason for cancelling the order"
                    description=""
                    spacing="sm"
                    orientation="vertical"
                    color="gray"
                    styles={{
                      label: {color: PRIMARY_COLOR, fontSize: '1rem', fontWeight: 'normal', marginBottom: '0'},
                    }}
                    required>
                  <Radio value="No longer needed" label="No longer needed" />
                  <Radio value="I've changed my mind" label="I've changed my mind" />
                  <Radio value="Being delivered to wrong address" label="Being delivered to wrong address" />
                  <Radio value="It was an impulse purchase" label="It was an impulse purchase" />
                  <Radio value="Delivery date keeps changing" label="Delivery date keeps changing" />
                  <Radio value="Found a better deal elsewhere" label="Found a better deal elsewhere" />
                  <Radio value="Heard bad reviews after ordering the product" label="Heard bad reviews after ordering the product" />
                  <Radio value="Not available to receive the package. Travelling or moving" label="Not available to receive the package. Travelling or moving" />
                  <Radio value="Bad customer care service or representative" label="Bad customer care service or representative" />
                </RadioGroup>
              </InputWrapper>
              <InputWrapper>
                <Textarea
                    {...form.getInputProps('comments')}
                    placeholder=""
                    label="Comments"
                    description="This helps us understand how we failed to meet your expectations and how we can better serve you in the future."
                />
              </InputWrapper>
              <SubmitButton type={'submit'}>Submit and Cancel Order</SubmitButton>
            </form>
          </div>
        </Modal>
      </>
  )
};

const ReturnAction = ({orderId, type, books, bundles}: ReturnActionProps) => {
  const notif = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleReturn(values: any) {
    const payload = {
      ...values,
      books: values.books.filter((x: any) => x.active).map((x: any) => x.value),
      bundles: values.bundles.filter((x: any) => x.active).map((x: any) => x.value),
    };

    try {
      await axios.post(`/orders/return/${orderId}`, payload, {withCredentials: true});
      notif.showNotification({message: 'Request received', color: 'green', autoClose: 3000});
      updateOrder();
      closeModal();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function updateOrder() {
    mutate({
      url: `/orders/getByUniqueId/${router.query.id}`,
      withCredentials: true
    });
  }

  function openModal() {
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  return (
      <>
        <AppButton variant={ButtonVariants.Secondary} styles={{width: '48%', marginRight: '2%', marginBottom: '1rem'}} onClick={openModal}>
          {startCase(type) + ' Request'}
        </AppButton>

        <FeedbackModal type={type} books={books} bundles={bundles} open={open} onClose={closeModal} onSubmit={handleReturn}/>
      </>
  )
};

const ProductItem = ({book}: any) => {
  const router = useRouter();

  function viewProductDetails() {
    router.push(`/books/${book.product.bookId}`);
  }

  function renderImageSize(p: string, w: number, h: number) {
    return getProductImage(p, {height: h, width: w, fit: 'cover'});
  }

  return (
      <CartItem>
        <CartContent>
          <div>
            <CartImage onClick={viewProductDetails} src={renderImageSize(book.product.poster, 274, 375)}
                       alt={book.product.title} width={75} height={110}/>
          </div>
          <CartProductInfo>
            <CartProductTitle onClick={viewProductDetails}>{book.product.title}</CartProductTitle>
            <p>By <strong>{book.product?.author?.name}</strong></p>
            <p>
              {
                book.discount
                    ? <>
                      <Crossed>{currencyFormat(book.price)}</Crossed>
                      <span>{currencyFormat(returnDiscountedAmount(book.price, book.discount))} x {book.quantity}</span>
                    </>
                    : <span>{currencyFormat(book.price)}</span>

              }
              <small className="text-positive">&nbsp;({book.discount}% Off)</small>
            </p>
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

const BundleItem = ({bundle}: any) => {
  function renderImageSize(p: string, w: number, h: number) {
    return getBundleImage(p, {height: h, width: w, fit: 'cover'});
  }

  return (
      <CartItem>
        <CartContent>
          <div className="image">
            <Link href={`/bundles/${bundle.bundle.bundleId}`} passHref>
              <CartImage
                src={renderImageSize(bundle.bundle.poster, 300, 300)}
                alt={bundle.bundle.title}
                width={300} height={300}/>
            </Link>
          </div>
          <CartProductInfo>
            <Link href={`/bundles/${bundle.bundle.bundleId}`} passHref>
              <CartProductTitle>{bundle.bundle.title}</CartProductTitle>
            </Link>
            <p>
              {
                bundle.discount
                    ? <>
                      <Crossed>{currencyFormat(bundle.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(bundle.price, bundle.discount))}</span></>
                    : <span>{currencyFormat(bundle.price)}</span>

              }
              <small className="text-positive">&nbsp;(Extra {bundle.discount} % Off)</small>
            </p>
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

const OrderDetails: React.FC<Props> = () => {
  const router = useRouter();

  const {data, error} = useSWR({
    url: router.query.id ? `/orders/getByUniqueId/${router.query.id}` : null,
    withCredentials: true
  });

  function track(trackingId: string) {
    window.open(TRACKING_LINK(trackingId));
  }

  function navigateToContact() {
    router.push('/contact');
  }

  const order: IOrder = get(data, 'data', null);

  if (error) return <PageWrapper><EmptySectionMessage title={error.message}/></PageWrapper>;
  if (!order) return <PageWrapper><EmptySectionMessage title={'Loading Order Info...'}/></PageWrapper>;

  return (
      <>
        <Head>
          <title>Order Details {order.orderId} | Pageaters</title>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS({title: order.orderId})}/>
              </div>
            </div>
          </div>
          <section>
            <PageHeadings title={order.orderId}/>
          </section>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col-xl-8 col-md-8 col-12">
                  <OrderCard>
                    <div className="row">
                      <div className="col-xl-6 col-12">
                        <DeliveryAddress>
                          <Title>Order Date:</Title>
                          <p>{moment(order.orderDate).format('DD MMM YYYY')}</p>

                          <Title>Delivery Address:</Title>
                          <AddressContactInfo>{order.deliveryAddress.fullName} ({order.deliveryAddress.type})</AddressContactInfo>
                          <span>{order.deliveryAddress.addressLine1 + ', '} {order.deliveryAddress.addressLine2 + ', '} {order.deliveryAddress.landmark}</span>
                          <span>{order.deliveryAddress.city + ', '}{order.deliveryAddress.state + ' - '}{order.deliveryAddress.pinCode}</span>
                        </DeliveryAddress>
                      </div>
                      <div className="col-xl-3 col-12">
                        <PaymentSummary>
                          <Title>Payment Info:</Title>
                          <PaymentList>
                            {returnPaymentBreakdown(order.payment)}
                          </PaymentList>
                        </PaymentSummary>
                      </div>
                      <div className="col-xl-3 col-12">
                        <OrderBreakdown>
                          <Title>Order Summary:</Title>
                          <OrderAmounts>
                            <OrderAmountListItem><span>Subtotal:</span>
                              <span>{currencyFormat(order.subTotal)}</span></OrderAmountListItem>
                            <OrderAmountListItem><span>Shipping:</span>
                              <span>{currencyFormat(order.shipping)}</span></OrderAmountListItem>
                            <OrderAmountListItem><span>Grand Total:</span>
                              <span>{currencyFormat(order.total)}</span></OrderAmountListItem>
                          </OrderAmounts>
                        </OrderBreakdown>
                      </div>
                    </div>
                  </OrderCard>
                  <OrderCard>
                    <h6>Order Items</h6>

                    <ProductList>
                      {
                        order.products.map((item: any) => {
                          return (
                              <ProductListItem key={item._id}>
                                <ProductItem book={item}/>
                              </ProductListItem>
                          )
                        })
                      }
                      {
                        order.bundles.map((item: any) => {
                          return (
                              <ProductListItem key={item._id}>
                                <BundleItem bundle={item}/>
                              </ProductListItem>
                          )
                        })
                      }
                    </ProductList>
                  </OrderCard>
                </div>
                <div className="col-xl-4 col-md-4 col-12">
                  <OrderCard>
                    <h6>Order Actions</h6>
                    {
                      (order.orderStatus === ORDER_STAGES.PAID || order.orderStatus === ORDER_STAGES.SHIPPED) &&
                      <ShipmentAction shipment={order.shipmentTrackingId}/>
                    }
                    {
                      order.orderStatus === ORDER_STAGES.FULFILLED && (
                          <>
                            <AppButton variant={ButtonVariants.Accent} size={ButtonSizes.Large}
                                       styles={{width: '100%', marginBottom: '1rem', display: 'block'}}
                                       onClick={() => console.log(1)}>
                              Review Products
                            </AppButton>
                            <ReturnAction type={ORDER_REQUEST_TYPES.RETURN} orderId={order.orderId} books={order.products}  bundles={order.bundles}/>
                            <ReturnAction type={ORDER_REQUEST_TYPES.REPLACE} orderId={order.orderId} books={order.products} bundles={order.bundles}/>
                          </>
                      )
                    }
                    {
                      (order.orderStatus === ORDER_STAGES.RETURNED) && (
                          <AppButton variant={ButtonVariants.LightestPrimary} disabled={true}
                                     onClick={() => console.log('1')} styles={{width: '100%', marginBottom: '1rem'}}>
                            {'Return in Progress'}
                          </AppButton>
                      )
                    }
                    {
                      (order.orderStatus === ORDER_STAGES.RETURNED_IN_PROGRESS || order.orderStatus === ORDER_STAGES.REPLACEMENT_IN_PROGRESS) && (
                          <AppButton variant={ButtonVariants.Accent} onClick={() => track(order.shipmentTrackingId)}
                                     styles={{width: '100%', marginBottom: '1rem'}}>
                            {'Track Shipment'}
                          </AppButton>
                      )
                    }
                    <AppButton variant={ButtonVariants.Secondary} onClick={navigateToContact}
                               styles={{width: '100%', marginBottom: '0.5rem'}}>
                      {'Contact Us'}
                    </AppButton>
                    {
                      (order.orderStatus === ORDER_STAGES.PAID || order.orderStatus === ORDER_STAGES.SHIPPED || order.orderStatus === ORDER_STAGES.CONFIRMED) &&
                      <CancelAction orderId={order.orderId}/>
                    }
                  </OrderCard>
                  <OrderCard>
                    <h6>Order Timeline</h6>
                    <Timeline color="gray" active={order.orderHistory.length} lineWidth={3} bulletSize={24}>
                      {
                        order.orderHistory.map((item: IOrderHistory) => {
                          return (
                              <Timeline.Item key={item._id} title={`Order ${startCase(item.title)}`}
                                             bullet={<Icon icon={'ic:twotone-check-circle'} width={16} height={16}/>}>
                                <Text color="dimmed" size="sm">{item.description}</Text>
                                <Text size="xs"
                                      mt={4}>{moment.utc(item.time).local().startOf('seconds').fromNow()}</Text>
                              </Timeline.Item>
                          )
                        })
                      }
                    </Timeline>
                  </OrderCard>
                </div>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default OrderDetails;
