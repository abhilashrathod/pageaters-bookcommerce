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
        <style jsx>{`
          .breadcrumb {
            display: flex;
            flex-wrap: wrap;
            padding: 0 0;
            margin-bottom: 0;
            list-style: none;
          }          
          .breadcrumb-item + .breadcrumb-item {
            padding-left: 0.5rem;
          }
          .breadcrumb-item + .breadcrumb-item::before {
            float: left;
            padding-right: 0.5rem;
            color: #6c757d;
            content: var(--bs-breadcrumb-divider, "/") /* rtl: var(--bs-breadcrumb-divider, "/") */;
          }
          .breadcrumb-item.active {
            color: #6c757d;
          }
      `}</style>
        <div aria-label="breadcrumb">
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
