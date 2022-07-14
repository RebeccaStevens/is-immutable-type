declare module "rollup-plugin-unassert" {
  export default function (opts?: {
    include?: string[];
    exlude?: string[];
    sourcemap?: boolean;
    assertionPatterns?: string[];
    requirePatterns?: string[];
    importPatterns?: string[];
  }): {
    name: string;
    transform(code: string, id: string): any;
  };
}
