// Local visual fixture only. Never imports credentials or contacts Supabase.
// Run: node scripts/phase1-ui-baseline.mjs
// States: ?qa=populated|empty|loading|error|save-error, optional &locale=ms&theme=dark.
import { createServer } from 'vite';

const auth = `export const useAuth=()=>({user:{id:'phase1-fixture',email:'fixture@example.invalid'},loading:false,requiresMfa:false,authError:null,signOut:async()=>{},refreshMfa:async()=>{}}); export const AuthProvider=({children})=>children;`;
const finance = `
const params=new URLSearchParams(location.search), state=params.get('qa')||'populated';
const category={id:'cat-1',user_id:'phase1-fixture',name:'Groceries',type:'expense',color:'#4265ee',created_at:''};
const payment={id:'pay-1',user_id:'phase1-fixture',name:'Cash',type:'cash',created_at:''};
const tx={id:'tx-1',user_id:'phase1-fixture',description:'Synthetic groceries',amount:80,currency:'MYR',type:'expense',category_id:'cat-1',payment_method_id:'pay-1',transaction_date:new Date().toISOString(),created_at:''};
const result=data=>({data:state==='empty'&&Array.isArray(data)?[]:data,isPending:state==='loading',error:state==='error'?new Error('Synthetic data unavailable'):null,refetch:async()=>{}});
const mutation={isPending:false,mutateAsync:async()=>{if(state==='save-error')throw new Error('Synthetic save failure');}};
export const useTransactions=()=>result([tx,{...tx,id:'tx-2',description:'Synthetic salary',type:'income',amount:5000,category_id:null}]);
export const useCategories=()=>result([category]);
export const usePaymentMethods=()=>result([payment]);
export const useProfile=()=>result({id:'phase1-fixture',username:'Phase 1 visual fixture',currency:'MYR',language:params.get('locale')||'en',theme:params.get('theme')||'light'});
export const useFinanceRealtime=()=>{};
export const useTransactionMutations=()=>({create:mutation,update:mutation,remove:mutation});
export const useCategoryMutations=useTransactionMutations;
export const usePaymentMethodMutations=useTransactionMutations;
export const useUpdateProfile=()=>mutation;
`;
const server=await createServer({
  envDir:false,
  server:{host:'127.0.0.1',port:5174,strictPort:true},
  plugins:[{
    name:'phase1-local-fixtures',enforce:'pre',apply:'serve',
    transform(_code,id){
      const path=id.replaceAll('\\','/').split('?')[0];
      if(path.endsWith('/src/hooks/useAuth.tsx'))return auth;
      if(path.endsWith('/src/hooks/useFinanceData.ts'))return finance;
      if(path.endsWith('/src/lib/supabase.ts'))return `export const supabase={auth:{mfa:{listFactors:async()=>({data:{totp:[]},error:null})},updateUser:async()=>({error:new Error('Disabled in fixture')})}};`;
    },
    configureServer(vite){
      vite.middlewares.use((req,res,next)=>{
        if(req.url?.startsWith('/api/')){
          if(!req.url.startsWith('/api/rates?')){res.statusCode=404;res.end();return;}
          res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({base:'MYR',rates:{USD:.23,EUR:.21,JPY:34,MYR:1},updatedAt:Date.now(),source:'Phase 1 synthetic fixture'}));return;
        }
        next();
      });
    },
    transformIndexHtml(html){return html.replace('<body>','<body><aside style="background:#fff3cd;color:#332600;padding:8px;text-align:center">Phase 1 LOCAL FIXTURE — synthetic data; saves are not persisted.</aside>');}
  }]
});
await server.listen();server.printUrls();
