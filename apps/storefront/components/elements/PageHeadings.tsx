import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {Select} from '@mantine/core';
import {SelectItem} from "@mantine/core/lib/components/Select/types";

import {PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";

interface Props {
  title: string;
  showFilters?: boolean;
  defaultFilter?: any;
  filterOptions?: Array<SelectItem>;
  onFilterSelect?: (s: string) => void;
}

const HeadingText = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const PageHeadings: React.FC<Props> = ({title, defaultFilter, showFilters, filterOptions, onFilterSelect}) => {
  const [selectedFilters, setSelectedFilters] = useState(defaultFilter?.value || '');

  function onHandleChange(e: any) {
    setSelectedFilters(e);
    // @ts-ignore
    onFilterSelect(e);
  }

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col-12">
              <HeadingText>
                <h1 className={'display-1'}>
                  {title}
                </h1>

                {
                  showFilters && (
                      <div>
                        <Select
                            defaultValue={defaultFilter.value}
                            placeholder={'Select Option'}
                            size={'xs'}
                            transition={'pop'}
                            transitionDuration={100}
                            value={selectedFilters}
                            onChange={onHandleChange}
                            styles={{
                              item: {color: PRIMARY_COLOR},
                              root: {display: 'flex', alignItems: 'center'},
                              label: {marginBottom: 0, marginRight: '0.5rem'},
                              selected: {backgroundColor: PRIMARY_COLOR, color: SECONDARY_COLOR},
                              hovered: {backgroundColor: PRIMARY_COLOR, color: SECONDARY_COLOR},
                              input: {color: PRIMARY_COLOR, borderRadius: '1.5rem'},
                            }}
                            data={filterOptions || []}
                        />
                      </div>
                  )
                }
              </HeadingText>
            </div>
          </div>
        </div>
      </>
  )
};

export default PageHeadings;
