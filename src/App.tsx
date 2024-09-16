import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const ITEMS_PER_PAGE = 12;

const App: React.FC = (): JSX.Element => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<Set<number>>(new Set());
  const [deselectedArtworkIds, setDeselectedArtworkIds] = useState<Set<number>>(new Set());
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [rowsToSelect, setRowsToSelect] = useState<number | null>(null);
  const op = useRef<OverlayPanel | null>(null);

  useEffect(() => {
    fetchArtworks(page);
  }, [page]);

  const fetchArtworks = async (pageNumber: number): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${pageNumber}`);
      setArtworks(response.data.data);
      setTotalRecords(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const onPageChange = (event: DataTablePageEvent): void => {
    const newPage = event.page ?? 0;
    setPage(newPage + 1);  //because it is  0 based 
  };

  const onSelectionChange = (e: { value: Artwork[] }): void => {
    const selectedIds = new Set(e.value.map((artwork) => artwork.id));

    setSelectedArtworkIds((prevSelected) => {
      const updatedSelected = new Set(prevSelected);

      artworks.forEach((artwork) => {
        if (selectedIds.has(artwork.id)) {
          updatedSelected.add(artwork.id);
          setDeselectedArtworkIds((prevDeselected) => {
            const updatedDeselected = new Set(prevDeselected);
            updatedDeselected.delete(artwork.id);
            return updatedDeselected;
          });
        } else {
          updatedSelected.delete(artwork.id);
          setDeselectedArtworkIds((prevDeselected) => new Set([...prevDeselected, artwork.id]));
        }
      });

      return updatedSelected;
    });
  };
  const handleSelectRows = async (): Promise<void> => {
    if (rowsToSelect !== null && rowsToSelect > 0) {
      let selected: Set<number> = new Set(selectedArtworkIds);
      let currentPage = 1;

      while (selected.size < rowsToSelect) {
        try {
          const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${currentPage}`);
          const artworksToSelectFrom = response.data.data;
          const remainingToSelect = rowsToSelect - selected.size;
          const availableToSelect = Math.min(remainingToSelect, artworksToSelectFrom.length);

          artworksToSelectFrom.slice(0, availableToSelect).forEach((artwork: { id: number; }) => {
            if (!deselectedArtworkIds.has(artwork.id)) {
              selected.add(artwork.id);
            }
          });

          currentPage++;
        } catch (error) {
          console.error('Error fetching artworks for selection:', error);
          break;
        }
      }
      setSelectedArtworkIds(selected);
      fetchArtworks(page);
      op.current?.hide();
    }
  };

  const headerTemplate = (): JSX.Element => {
    return (
      <div className="flex align-items-center">
        <Button
          icon="pi pi-chevron-down"
          onClick={(e) => op.current?.toggle(e)}
          className="p-button-text p-button-plain"
          aria-label="Options"
        />
        <OverlayPanel ref={op} showCloseIcon>
          <div className="p-fluid">
            <div className="p-field">
              <label htmlFor="rowsToSelect">Select Rows (max {totalRecords})</label>
              <InputNumber
                id="rowsToSelect"
                value={rowsToSelect}
                onValueChange={(e) => setRowsToSelect(e.value as number | null)}
                min={1}
                max={totalRecords}
                placeholder="Enter rows..."
              />
            </div>
            <Button label="Submit" onClick={handleSelectRows} />
          </div>
        </OverlayPanel>
      </div>
    );
  };

  return (
    <div className="datatable-container">
      <DataTable
        value={artworks}
        paginator
        first={(page - 1) * ITEMS_PER_PAGE}
        rows={ITEMS_PER_PAGE}
        totalRecords={totalRecords}
        loading={loading}
        selection={artworks.filter((artwork) => selectedArtworkIds.has(artwork.id))}
        onSelectionChange={onSelectionChange}
        onPage={onPageChange}
        selectionMode="multiple"
        lazy
      >
        <Column
          selectionMode="multiple"
          header={headerTemplate}
        />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Place Of Origin" />
        <Column field="artist_display" header="Artist Display" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Date Start" />
        <Column field="date_end" header="Date End" />
      </DataTable>
    </div>
  );
};

export default App;
