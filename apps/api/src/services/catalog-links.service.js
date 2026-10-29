// Two-way links between catalog records (a bundle listed on its books' `relatedBundles`, a collection on its books'
// `relatedCollections`, …), shared by the store-book, bundle and collection services.

/**
 * Adds `targetId` to the `field` list of each record in `ids` that exists and doesn't list it yet, one record at a
 * time. Records that already list it are not written (so their `updatedAt` stays); unknown ids are skipped.
 * Legacy: `ids` must be an array; anything else throws (the callers' create/update then answer 500).
 * @param {import('mongoose').Model} Model Model of the records to update.
 * @param {string[]} ids Record ids.
 * @param {string} field Array field of ObjectIds on those records.
 * @param {import('mongoose').Types.ObjectId} targetId Id to add.
 * @returns {Promise<void>}
 */
const addBackLinks = async (Model, ids, field, targetId) => {
  for (const id of ids) {
    const record = await Model.findOne({ _id: id }).select(`title ${field}`);
    if (!record) continue;

    const isThere = record.toObject()[field].find((linked) => linked.toString() === targetId.toString());
    if (!isThere) await Model.findOneAndUpdate({ _id: id }, { $addToSet: { [field]: targetId } });
  }
};

module.exports = { addBackLinks };
