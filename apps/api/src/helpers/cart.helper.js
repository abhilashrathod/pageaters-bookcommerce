module.exports.calculateTotal = async function(books, bundles, boxes, addOns) {
  try {
    let total = 0;

    for (let book of books) {
      book.productTotal = book.quantity * Math.floor((book.product.price - ((book.product.currentDiscount * book.product.price) / 100)));
      book.price = book.product.price;
      total = total + Math.floor(book.productTotal);
    }

    for (let bundle of bundles) {
      bundle.total = bundle.quantity * Math.floor((bundle.bundle.price - ((bundle.bundle.currentDiscount * bundle.bundle.price) / 100)));
      total = total + Math.floor(bundle.total);
    }

    for (let box of boxes) {
      box.total = box.quantity * Math.floor((box.box.price - ((box.box.currentDiscount * box.box.price) / 100)));
      box.price = box.box.price;
      total = total + Math.floor(box.total);
    }

    for (let addOn of addOns) {
      addOn.total = addOn.quantity * Math.floor((addOn.addOn.price - ((addOn.addOn.currentDiscount * addOn.addOn.price) / 100)));
      addOn.price = addOn.addOn.price;
      total = total + Math.floor(addOn.total);
    }

    return total;
  } catch (e) {
    return 0;
  }
};
