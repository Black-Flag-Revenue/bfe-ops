import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { LineItem } from './invoiceParsing';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1px solid #eee' },
  label: { color: '#555' },
  total: { fontSize: 14, fontWeight: 700, marginTop: 12, textAlign: 'right' },
  badge: { fontSize: 10, color: '#8A6D2F', marginTop: 4 },
});

export function InvoicePdfDocument({
  invoice,
  subAccountName,
  contactName,
  lineItems,
}: {
  invoice: {
    number: string;
    type: string;
    total: any;
    acceptedAt: Date | null;
    acceptedOptionGroup: string | null;
    scheduledDate: Date | null;
  };
  subAccountName: string;
  contactName: string | null;
  lineItems: LineItem[];
}) {
  const relevantItems = invoice.acceptedOptionGroup
    ? lineItems.filter((i) => i.optionGroup === invoice.acceptedOptionGroup)
    : lineItems;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{subAccountName}</Text>
        <Text style={styles.subtitle}>
          {invoice.type === 'ESTIMATE' ? 'Estimate' : 'Invoice'} {invoice.number}
          {contactName ? ` — Prepared for ${contactName}` : ''}
        </Text>

        {invoice.acceptedAt && (
          <Text style={styles.badge}>
            Accepted {invoice.acceptedAt.toLocaleDateString()}
            {invoice.acceptedOptionGroup ? ` — Option: ${invoice.acceptedOptionGroup}` : ''}
          </Text>
        )}
        {invoice.scheduledDate && (
          <Text style={styles.badge}>Scheduled: {invoice.scheduledDate.toLocaleString()}</Text>
        )}

        <Text style={styles.sectionTitle}>Line Items</Text>
        {relevantItems.map((item, i) => (
          <View key={i} style={styles.row}>
            <Text>{item.description} {item.qty > 1 ? `x${item.qty}` : ''}</Text>
            <Text>${(item.qty * item.unitPrice).toLocaleString()}</Text>
          </View>
        ))}

        <Text style={styles.total}>Total: ${Number(invoice.total).toLocaleString()}</Text>
      </Page>
    </Document>
  );
}
