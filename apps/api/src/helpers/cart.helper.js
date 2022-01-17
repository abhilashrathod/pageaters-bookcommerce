module.exports.calculateTotal = async function(books, bundles) {
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

    return total;
  } catch (e) {
    return 0;
  }
};
