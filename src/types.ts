export interface Tool {
    name: string;
    description: string;
    parameters: any;
    handler: (filters?: any, extra?: any) => Promise<any>;
}