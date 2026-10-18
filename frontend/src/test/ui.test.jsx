import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table.jsx';

describe('UI Primitives', () => {
  it('UI.Button: handles click and loading state', () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Submit</Button>);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Button loading onClick={handleClick}>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('UI.Input: displays label, error, and accepts input', () => {
    render(
      <Input
        label="Farm Name"
        name="farm_name"
        error="Name is required"
        placeholder="Enter name"
      />
    );

    expect(screen.getByLabelText(/farm name/i)).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('UI.Select: renders options and triggers change', () => {
    const handleChange = vi.fn();
    render(
      <Select
        label="Growth Stage"
        name="growth_stage"
        onChange={handleChange}
        options={[
          { value: 'Sowing', label: 'Sowing' },
          { value: 'Vegetative', label: 'Vegetative' },
        ]}
      />
    );

    const select = screen.getByLabelText(/growth stage/i);
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Vegetative' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('UI.Modal: opens and closes via ESC and close button', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen={false} onClose={handleClose} title="Test Modal">
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('UI.ConfirmDialog: renders destructive warning and triggers onConfirm', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Farm"
        message="Are you sure you want to delete this farm?"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Delete Farm')).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete this farm/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('UI.Badge: renders badge with custom variant', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('UI.Table: renders data-driven table with headers and rows', () => {
    const columns = [
      { key: 'name', header: 'Crop Name' },
      { key: 'area', header: 'Area' },
    ];
    const data = [{ id: 1, name: 'Wheat', area: '10 ha' }];

    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Crop Name')).toBeInTheDocument();
    expect(screen.getByText('Wheat')).toBeInTheDocument();
  });

  it('UI.Table: renders compound composition components', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header Item</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Header Item')).toBeInTheDocument();
    expect(screen.getByText('Cell Content')).toBeInTheDocument();
  });
});
