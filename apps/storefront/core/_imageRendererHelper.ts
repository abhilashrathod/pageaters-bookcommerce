import {BUCKETS, FILE_MODULES} from "./_variables";
import {Buffer} from "buffer";

interface ImageProps {
  height: number;
  width: number;
  fit?: string;
}

const getBucketName = (module: string) => {
  switch (module) {
    case FILE_MODULES.STORE_BOOK:
      return BUCKETS.BOOK;

    case FILE_MODULES.AUTHOR:
      return BUCKETS.AUTHOR;

    case FILE_MODULES.COLLECTION:
      return BUCKETS.COLLECTIONS;

    case FILE_MODULES.CATEGORY:
      return BUCKETS.CATEGORIES;

    case FILE_MODULES.BUNDLE:
      return BUCKETS.BUNDLES;

    case FILE_MODULES.ASSETS:
      return BUCKETS.ASSETS;

    default:
      return BUCKETS.BOOK;
  }
};

const universalBtoa = (str: string) => {
  try {
    return btoa(str);
  } catch (err) {
    return Buffer.from(str).toString('base64');
  }
};

const universalAtob = (b64Encoded: any) => {
  try {
    return atob(b64Encoded);
  } catch (err) {
    return Buffer.from(b64Encoded, 'base64').toString('binary');
  }
};

export const getProductImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.STORE_BOOK),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getHeroBannerImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.ASSETS),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getCollectionImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.COLLECTION),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });
  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getBundleImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.BUNDLE),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getCategoryImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.CATEGORY),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getAuthorImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.AUTHOR),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};

export const getAssetImage = (imageName: string, {height, width, fit}: ImageProps) => {
  const imageRequest = JSON.stringify({
    bucket: getBucketName(FILE_MODULES.ASSETS),
    key: imageName,
    edits: {
      resize: {
        height,
        width,
        fit,
      }
    }
  });

  return `${process.env.NEXT_PUBLIC_IMAGE_CLOUDFRONT_URL}/${universalBtoa(imageRequest)}`;
};
