<script lang="ts">
export default {
  onLaunch() {
    console.log('NebulaDrive 星云网盘启动');
  },
};
</script>

<style>
page {
  background: #f5f7fa;
  color: #2c3e50;
  font-size: 14px;
}
.container {
  padding: 12px;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.btn-primary:active {
  background: #2f6fd8;
}
.input {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #fff;
}
.card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.row:last-child {
  border-bottom: none;
}
.muted {
  color: #909399;
  font-size: 12px;
}
.error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 8px;
}
</style>
