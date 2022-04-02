import React from 'react';
import Link from "next/link";

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
                            ? <span>{item.title.length > 15 ? item.title.slice(0, 15) + '...' : item.title}</span>
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
