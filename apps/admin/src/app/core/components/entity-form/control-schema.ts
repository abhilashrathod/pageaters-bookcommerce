export interface IControlSchema {
  name: string;
  type: string;
  isRequired: boolean;
  ui: {
    placeholder: string;
  };
  source?: Array<IControlSource>;
}

interface IControlSource {
  label: string;
  value: string;
}
