import { Autocomplete, TextField } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { SelectableBookOption } from './types';

export function BookSelector({
  options,
  value,
  onChange,
}: {
  options: SelectableBookOption[];
  value: SelectableBookOption[];
  onChange: (selectedBookIsbns: string[]) => void;
}) {
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      size="small"
      options={options}
      value={value}
      onChange={(_, selectedOptions) => {
        onChange(selectedOptions.map((option) => option.isbn));
      }}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;
        const SelectionIcon = selected
          ? CheckBoxIcon
          : CheckBoxOutlineBlankIcon;

        return (
          <li key={key} {...optionProps}>
            <SelectionIcon
              fontSize="small"
              style={{
                marginRight: 8,
                padding: 9,
                boxSizing: 'content-box',
              }}
            />
            {option.label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="選取書本（Selection indicators）"
          placeholder="勾選要套用的書本（不選則全部）"
          helperText="勾選後會套用到清單、待付金額與一次付清/取消付款"
        />
      )}
    />
  );
}

export default BookSelector;
