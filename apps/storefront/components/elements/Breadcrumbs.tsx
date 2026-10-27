import React from 'react';
import Link from "next/link";
import {get} from 'lodash';

interface BreadcrumbItem {
  href: string;
  title: string;
  isActive?: boolean;
}

interface Props {
  items: Array<BreadcrumbItem>;
}

const Breadcrumbs: React.FC<Props> = ({items}) => {
  return (
      <>
        <div className={'breadcrumbs'} aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            {
              items.map((item, index) => {
                return (
                    <li key={index} className={"breadcrumb-item " + (item.isActive ? 'active' : '')}
                        aria-current="page">
                      {
                        item.isActive
                            ? <span>{get(item, 'title', '').length > 15 ? get(item, 'title', '').slice(0, 15) + '...' : get(item, 'title', '')}</span>
                            : <Link href={item.href}><a>{item.title}</a></Link>

                      }
                    </li>
                )
              })
            }
          </ol>
        </div>
      </>
  )
};

export default Breadcrumbs;
