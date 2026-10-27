import React from 'react';
import {IAuthor} from "../../schemas/author";

interface Props {
  author: IAuthor;
}

const AuthorsCardLarge: React.FC<Props> = ({author}) => {
  return (
      <>
        <div className="author-item">
          <div className="author-image-area">
            <img src={author.avatar} alt="author.name"/>
          </div>
          <div className="author-content-area">
            <h4>{author.name}</h4>
            <p>{author.books.length} Books</p>
          </div>
        </div>
      </>
  )
};

export default AuthorsCardLarge;
